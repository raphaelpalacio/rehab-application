from pydantic_settings import BaseSettings
from pathlib import Path
from dotenv import load_dotenv
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

    class Config:
        # We will use dotenv to load the environment variables
        env_file = _path if (_path.exists()) else None

if _path.exists():
    # Let's load the environment variables in
    load_dotenv(_path)

settings = EnvironmentSettings()

firebase_app = firebase_admin.initialize_app()
