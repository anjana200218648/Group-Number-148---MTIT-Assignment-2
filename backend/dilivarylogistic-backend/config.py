from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "delivery-and-logistic-mservice-firebase-adminsdk-fbsvc-22638a4175.json")
    PROJECT_NAME: str = "Delivery & Logistics Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
settings = Settings()