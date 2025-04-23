from fastapi import Security, UploadFile, Request, HTTPException
from fastapi.routing import APIRouter
from auth import FBUser, verifier
from pydantic import BaseModel
from exceptions import BadRequestException
from config import minio_client, settings
from firebase_admin import auth as admin_auth
import psycopg2
import random
import string
from typing import Literal
from dotenv import load_dotenv
import os

conn = psycopg2.connect(
    dbname=settings.db_name,
    user=settings.db_user,
    password=settings.db_password,
    host=settings.db_host,
    port=settings.db_port
)

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

@video_router.post("/upload", status_code=200)
async def upload_video(file: UploadFile, user: FBUser = Security(verifier)):
    """
    This is used to upload a video file so we can store it. Must be sent as a multipart/form-data request
    and the file must be of type quicktime (used for mov)
    """
    
    if file is None:
        raise BadRequestException("No file provided in the request.")

    if file.content_type != "video/quicktime":
        raise BadRequestException(f"Invalid file type: {file.content_type}. Expected 'video/quicktime'.")


    minio_client.put_object(
        bucket_name=settings.bucket_name,
        object_name=f"videos/{file.filename}",
        data=file.file,
        length=file.size,
        content_type=file.content_type
    )

    # users
    # id
    # type (doctor or patient)
    
    # videos
    # id
    # doctor_id (should be a doctor)
    # patient_id
    
    return {"message": "Video uploaded successfully"}

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

        cur = conn.cursor()
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
        cur = conn.cursor()

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

            cur.execute("""UPDATE patients SET doctor_id = %s WHERE id = %s;""", (doctor_id, user.uid))
            cur.execute("""UPDATE doctors SET patients = array_append(patients, %s) WHERE id = %s;""", (user.uid, doctor_id))

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

            cur.execute("""UPDATE patients SET doctor_id = %s WHERE id = %s""", (user.uid, patient_id))
            cur.execute("""UPDATE doctors SET patients = array_append(patients, %s) WHERE id = %s""", (patient_id, user.uid))

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
    cur = conn.cursor()

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
        cur = conn.cursor()
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
        cur = conn.cursor()
        
        cur.execute("UPDATE patients SET doctor_id = NULL;")
        cur.execute("UPDATE doctors SET patients = ARRAY[]::text[];")
        
        conn.commit()
        return {"message": "Database reset successful"}

    except Exception as e:
        conn.rollback()
        print("Error during reset:", e)
        raise HTTPException(status_code=500, detail="Error resetting database")
