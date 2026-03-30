import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # When running locally, allow values from backend/.env.
    # In Docker/CI, container environment variables should be provided.
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    JWT_SECRET_KEY: str | None = None
    JWT_ALGORITHM: str = "HS256"

    # Firebase config (required by core/firebase.py)
    FIREBASE_SERVICE_ACCOUNT: str | None = None
    FIREBASE_STORAGE_BUCKET: str | None = None


_s = Settings()

JWT_SECRET_KEY: str = _s.JWT_SECRET_KEY or ""
JWT_ALGORITHM: str = _s.JWT_ALGORITHM

# Firebase configuration (required by `core/firebase.py`).
FIREBASE_SERVICE_ACCOUNT: str | None = _s.FIREBASE_SERVICE_ACCOUNT
FIREBASE_STORAGE_BUCKET: str | None = _s.FIREBASE_STORAGE_BUCKET

# Validate required secrets early.
if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not configured. Please set it in the environment or in backend/.env."
    )

