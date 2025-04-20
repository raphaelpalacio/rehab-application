from fastapi import Security, UploadFile
from fastapi.routing import APIRouter
from auth import FBUser, verifier
from pydantic import BaseModel
from exceptions import BadRequestException

# This will be our main router
router = APIRouter()
video_router = APIRouter(prefix="/video")

router.include_router(video_router)

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
async def upload_video(file: UploadFile | None = None, user: FBUser = Security(verifier)):
    """
    This is used to upload a video file so we can store it. Must be sent as a multipart/form-data request
    and the file must be of type quicktime (used for mov)
    """
    
    if file is None or file.content_type != "video/quicktime":
        raise BadRequestException("File must be of type video/quick")

    contents = await file.read()
    
    
    return {"message": "Video uploaded successfully"}