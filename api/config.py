from pydantic_settings import BaseSettings
from pathlib import Path
from dotenv import load_dotenv
from minio import Minio
from minio.error import S3Error
import firebase_admin

env_path = ".env"

_path = Path(env_path)

"""
This file provides the configurations for the applications
"""

"""
This file verifies the environment variables required are populated
"""
class EnvironmentSettings(BaseSettings):
    level: str
    google_application_credentials: str
    bypass_auth: bool = False
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    bucket_name: str

    class Config:
        # We will use dotenv to load the environment variables
        env_file = _path if (_path.exists()) else None

if _path.exists():
    # Let's load the environment variables in
    load_dotenv(_path)

settings = EnvironmentSettings()

firebase_app = firebase_admin.initialize_app()

minio_client = Minio(
    endpoint=settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=False
)

# We want to make sure the bucket exists
if not minio_client.bucket_exists(settings.bucket_name):
    raise Exception(f"Bucket {settings.bucket_name} does not exist")
