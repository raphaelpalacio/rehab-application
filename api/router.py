from fastapi import Security, UploadFile, HTTPException, responses
from fastapi.routing import APIRouter
from auth import FBUser, verifier
from pydantic import BaseModel
from exceptions import BadRequestException
from config import minio_client, settings
from firebase_admin import auth as admin_auth
import random
import string
from typing import Literal
from init_db import conn, getDictCursor
from logger import logger
import uuid
import io

# This will be our main router
router = APIRouter()
video_router = APIRouter(prefix="/video")

default_scopes = ["doctor", "patient"]

def generate_connect_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


class HealthCheckResponse(BaseModel):
    status: str
    message: str

@router.get("/health", status_code=200, response_model=HealthCheckResponse)
def health_check():
    return HealthCheckResponse(status="ok", message="Service is healthy")

@router.get("/auth", status_code=200, response_model=FBUser)
def auth_test(user: FBUser = Security(verifier)):
    """
    This is a test endpoint to verify authentication
    """
    return user

class Video(BaseModel):
    id: int
    doctor_id: str
    patient_id: str
    object_name: str
    content_type: str

@video_router.post("/upload", status_code=201, response_model=Video)
async def upload_video(
    file: UploadFile,
    patient_id: str,
    user: FBUser = Security(verifier)
):
    """
    This is used to upload a video file so we can store it. Must be sent as a multipart/form-data request
    and the file must be of type quicktime (used for mov)
    """
    
    if file is None:
        raise BadRequestException("No file provided in the request.")

    if file.content_type not in ["video/quicktime", "video/mp4"]:
        raise BadRequestException(f"Invalid file type: {file.content_type}. Expected 'video/quicktime'.")

    res = minio_client.put_object(
        bucket_name=settings.bucket_name,
        object_name=f"videos/{file.filename}{uuid.uuid4()}",
        data=file.file,
        length=file.size,
        content_type=file.content_type
    )
    
    if res is None or res.object_name is None:
        raise HTTPException(status_code=500, detail="Failed to upload video to MinIO")
    
    try:
        with getDictCursor() as cur:
            cur.execute(
                "INSERT INTO videos (doctor_id, patient_id, object_name, content_type) VALUES (%s, %s, %s, %s) RETURNING *;",
                (user.uid, patient_id, res.object_name, file.content_type)
            )
            
            result = cur.fetchone()
            if result is None:
                raise HTTPException(status_code=500, detail="Failed to insert video record into database")
            
            video = Video.model_validate(**result)
            conn.commit()
            
            return video
    except Exception as e:
        conn.rollback()
        logger.error("Error in upload_video: %e", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")



@video_router.get("/get_videos", status_code=200, response_model=list[Video])
async def get_videos(user: FBUser = Security(verifier, scopes=default_scopes)):
    try:
        with getDictCursor() as cur:
            if user.role == "doctor":
                cur.execute("SELECT * FROM videos WHERE doctor_id = %s;", (user.uid,))
            elif user.role == "patient":
                cur.execute("SELECT * FROM videos WHERE patient_id = %s;", (user.uid,))
            else:
                raise HTTPException(status_code=400, detail="Invalid role")

            result = cur.fetchall()
            
            videos = [Video.model_validate(row) for row in result]
            return videos
    except Exception as e:
        logger.error("Error in get_videos: %e", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")

@video_router.get("/download/{object_name}", status_code=200)
async def download_video(object_name: str, user: FBUser = Security(verifier, scopes=default_scopes)):
    # First verify the user owns it, then use the row to fetch it
    try:
        with getDictCursor() as cur:
            if user.role == "doctor":
                cur.execute("SELECT * FROM videos WHERE doctor_id = %s AND id = %s LIMIT 1;", (user.uid, object_name))
            elif user.role == "patient":
                cur.execute("SELECT * FROM videos WHERE patient_id = %s AND id = %s LIMIT 1;", (user.uid, object_name))
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Video not found")
            video = Video.model_validate(result)
            
            # Now we retrieve it from the buckets
            try:
                res = minio_client.get_object(
                    bucket_name=settings.bucket_name,
                    object_name=video.object_name,
                )
                return responses.Response(
                    res.read(),
                    media_type=video.content_type,
                    filename=video.object_name.removeprefix("videos/")
                )
            finally:
                res.close()
                res.release_conn()
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error("Error in download_video: %e", e)
        raise HTTPException(status_code=500, detail="An error occurred")
                
class Role(BaseModel):
    role: Literal["doctor", "patient"]

@router.post("/set-role")
async def set_user_role(payload: Role, user: FBUser = Security(verifier)):
    """
    This is used to set the roles so that we can display different frontends.
    """
    try:
        role = payload.role

        admin_auth.set_custom_user_claims(user.uid, {"role": role})
        print(f"Role '{role}' set successfully")

        connect_code = generate_connect_code()
        print(f"[DEBUG] Role '{role}' set with connect_code: {connect_code}")

        with conn.cursor() as cur:
            if role == "doctor":
                cur.execute(
                    "INSERT INTO doctors (id, email, connect_code) VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING;",
                    (user.uid, user.email, connect_code)
                )
            elif role == "patient":
                cur.execute(
                    "INSERT INTO patients (id, email, connect_code) VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING;",
                    (user.uid, user.email, connect_code)
                )

            conn.commit()
            return {"message": f"Role '{role}' set successfully", "connect_code": connect_code}

    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")


class Code(BaseModel):
    code: str

@router.post("/connect")
async def connect_users(payload: Code, user: FBUser = Security(verifier, scopes=default_scopes)):
    """
    This is used to connect patients and doctors together.
    """
    try:
        with conn.cursor() as cur:
            if user.role == "patient":
                cur.execute("SELECT * FROM doctors WHERE connect_code = %s;", (payload.code,))
                result = cur.fetchone()
                doctor_id = result[0]

                cur.execute("SELECT doctor_id FROM patients WHERE id = %s;", (user.uid,))
                existing_doctor = cur.fetchone()[0]

                if not result:
                    raise HTTPException(status_code=404, detail="Doctor not found")

                if existing_doctor == doctor_id:
                    return {"message": "Already connected to this doctor"}

                cur.execute("UPDATE patients SET doctor_id = %s WHERE id = %s;", (doctor_id, user.uid))

            elif user.role == "doctor":
                cur.execute("SELECT * FROM patients WHERE connect_code = %s;", (payload.code,))
                result = cur.fetchone()
                patient_id = result[0]
                cur.execute("SELECT patients FROM doctors WHERE id = %s;", (user.uid,))
                existing_patients = cur.fetchone()[0] or []

                if not result:
                    raise HTTPException(status_code=404, detail="Patient not found")

                if user.uid in existing_patients:
                    return {"message": "Already connected to this doctor"}

                cur.execute("UPDATE patients SET doctor_id = %s WHERE id = %s", (user.uid, patient_id))

            else:
                raise HTTPException(status_code=400, detail="Invalid role")

        conn.commit()
        return {"message": "Connected successfully"}

    except Exception as e:
        print("Error in /connect:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connections")
async def get_connections(user: FBUser = Security(verifier, scopes=default_scopes)):
    """
    This is used to test the patient and doctor connections.
    """
    with conn.cursor() as cur:
        if user.role == "patient":
            cur.execute("SELECT doctor_id FROM patients WHERE id = %s;", (user.uid,))
            doctor_id = cur.fetchone()[0]
            return {"connected_to": doctor_id}

        elif user.role == "doctor":
            cur.execute("SELECT id, email FROM patients WHERE doctor_id = %s;", (user.uid,))
            patients = [{"id": row[0], "email": row[1]} for row in cur.fetchall()]
            return {"patients": patients}

    return {"connected_to": None}


@router.get("/connect-code")
async def get_connect_code(user: FBUser = Security(verifier, scopes=default_scopes)):
    """
    This is used to retrieve the connect code.
    """
    try:
        with conn.cursor() as cur:
            if user.role == "doctor":
                cur.execute("SELECT connect_code FROM doctors WHERE id = %s;", (user.uid,))
            elif user.role == "patient":
                cur.execute("SELECT connect_code FROM patients WHERE id = %s;", (user.uid,))
            else:
                raise HTTPException(status_code=400, detail="Invalid role")

            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="User not found")

            return {"connect_code": result[0]}
    except Exception as e:
        print("Error in /connect-code:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/reset-db")
async def reset_database():
    """
    This is used to reset the database.
    """
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE patients SET doctor_id = NULL;")
            cur.execute("UPDATE doctors SET patients = ARRAY[]::text[];")
            
            conn.commit()
            return {"message": "Database reset successful"}

    except Exception as e:
        conn.rollback()
        print("Error during reset:", e)
        raise HTTPException(status_code=500, detail="Error resetting database")
