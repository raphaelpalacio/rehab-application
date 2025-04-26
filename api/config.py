from pydantic_settings import BaseSettings
import firebase_admin

env_path = ".env"

"""
This file provides the configurations for the applications
"""

"""
This file verifies the environment required is inside the .env
"""
class EnvironmentSettings(BaseSettings):
    level: str
    google_application_credentials: str
    bypass_auth: bool = False

    class Config:
        env_file = env_path

settings = EnvironmentSettings()

firebase_app = firebase_admin.initialize_app()
