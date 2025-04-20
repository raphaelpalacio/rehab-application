from fastapi import FastAPI, Security
from fastapi.middleware.cors import CORSMiddleware
from router import router

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
