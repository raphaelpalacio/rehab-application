from fastapi import FastAPI, Security
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from config import env_path
from router import router

load_dotenv(env_path)

app = FastAPI()

# Allow requests to be received from any endpoint
# If we care for production, set allow_origins to specify
# the ios app url
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(router)
