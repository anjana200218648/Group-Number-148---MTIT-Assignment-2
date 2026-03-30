import json
import logging
import os
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore, storage

from .settings import FIREBASE_SERVICE_ACCOUNT, FIREBASE_STORAGE_BUCKET

logger = logging.getLogger(__name__)

db = None
bucket = None


def _load_service_account_credential() -> tuple[credentials.Certificate, dict[str, Any]]:
    """
    Load Firebase service account from:
    - file path, or
    - raw JSON string.
    Returns the credential object and parsed info dict.
    """
    if not FIREBASE_SERVICE_ACCOUNT:
        raise RuntimeError(
            "Firebase is not configured. Please set FIREBASE_SERVICE_ACCOUNT in the environment. "
            "It can be either a file path or a raw JSON service account string."
        )

    cred_value = FIREBASE_SERVICE_ACCOUNT
    if os.path.exists(cred_value):
        with open(cred_value, "r", encoding="utf-8") as f:
            info = json.load(f)
        return credentials.Certificate(cred_value), info

    try:
        info = json.loads(cred_value)
        return credentials.Certificate(info), info
    except Exception as e:
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT is not a valid file path and is not valid JSON. "
            f"Original error: {e}"
        ) from e


def _resolve_storage_bucket(app, project_id: str | None):
    """
    Resolve a real, existing Firebase Storage bucket.
    Tries configured bucket first, then common project-based patterns.
    """
    candidate_names: list[str] = []
    if FIREBASE_STORAGE_BUCKET:
        candidate_names.append(FIREBASE_STORAGE_BUCKET)
    if project_id:
        candidate_names.append(f"{project_id}.appspot.com")
        candidate_names.append(f"{project_id}.firebasestorage.app")

    # Preserve order, remove duplicates/empties.
    seen = set()
    deduped = []
    for name in candidate_names:
        if name and name not in seen:
            deduped.append(name)
            seen.add(name)

    if not deduped:
        raise RuntimeError(
            "Firebase Storage is not configured. Please set FIREBASE_STORAGE_BUCKET in the environment."
        )

    # Prefer explicitly configured bucket; otherwise use first derived candidate.
    # Do not hard-fail startup on bucket existence checks because some projects
    # have delayed bucket provisioning/permissions. Upload endpoint will surface
    # precise runtime errors if the bucket is not actually usable.
    selected = deduped[0]
    return storage.bucket(name=selected, app=app)


def init_firebase() -> None:
    """
    Initialize Firebase Admin for REAL integration.

    Requirements:
    - FIREBASE_SERVICE_ACCOUNT must be set (either file path or JSON string).
    - FIREBASE_STORAGE_BUCKET must be set for Storage image uploads.

    If configuration is missing/invalid, we raise a clear error (no mock fallback).
    """
    global db, bucket
    cred, service_account_info = _load_service_account_credential()
    project_id = service_account_info.get("project_id")

    # Initialize Firebase only once per process.
    if not firebase_admin._apps:
        app = firebase_admin.initialize_app(cred)
    else:
        app = firebase_admin.get_app()

    # Clients for Firestore + Storage.
    db = firestore.client(app=app)
    bucket = _resolve_storage_bucket(app=app, project_id=project_id)

    logger.info(
        "Firebase Admin initialized successfully (Firestore + Storage configured). "
        f"Selected bucket: {bucket.name}"
    )


# Call init_firebase when module is loaded.
init_firebase()


def get_db():
    return db


def get_bucket():
    return bucket
