from fastapi import Security
from fastapi.routing import APIRouter
from auth import FBUser, verifier
from pydantic import BaseModel

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
    