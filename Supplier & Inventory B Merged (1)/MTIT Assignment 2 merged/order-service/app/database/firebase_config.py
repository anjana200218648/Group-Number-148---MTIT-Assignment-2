import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from loguru import logger

# ─────────────────────────────────────────────
# Resolve the project root robustly.
# This file lives at:  <root>/app/database/firebase_config.py
# So BASE_DIR resolves to: <root>
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(          # → <root>
    os.path.dirname(                 # → <root>/app
        os.path.dirname(             # → <root>/app/database
            os.path.abspath(__file__)
        )
    )
)

# Load .env from the project root.  override=True ensures env vars set here
# always win over any stale process-level values.
_env_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=_env_path, override=True)

logger.debug(f"firebase_config | BASE_DIR = {BASE_DIR}")
logger.debug(f"firebase_config | .env loaded from = {_env_path} (exists={os.path.isfile(_env_path)})")

_db: firestore.Client | None = None


# ─────────────────────────────────────────────
# Credential resolution  (explicit, NO ADC fallback)
# ─────────────────────────────────────────────
def _resolve_credentials() -> credentials.Certificate:
    """
    Load Firebase credentials with the following priority:

    1. FIREBASE_CREDENTIALS_JSON  — full JSON string in env var
                                    (best for Docker / CI / cloud deployments)
    2. FIREBASE_SERVICE_ACCOUNT_KEY — path to a .json key file
                                      (absolute, or relative to project root)
    3. Hard default: <project_root>/serviceAccountKey.json

    Raises FileNotFoundError / ValueError with actionable messages so the
    developer knows exactly what to fix — no silent fallback to ADC.
    """

    # ── Priority 1: inline JSON string ──────────────────────────────────────
    raw_json = os.getenv("FIREBASE_CREDENTIALS_JSON", "").strip()
    if raw_json:
        try:
            cred_dict = json.loads(raw_json)
            logger.info("Firebase: loading credentials from FIREBASE_CREDENTIALS_JSON env var.")
            return credentials.Certificate(cred_dict)
        except json.JSONDecodeError as exc:
            raise ValueError(
                "FIREBASE_CREDENTIALS_JSON contains invalid JSON. "
                f"Check your .env or environment variables. Details: {exc}"
            ) from exc

    # ── Priority 2 / 3: key file ─────────────────────────────────────────────
    key_value = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "serviceAccountKey.json").strip()
    logger.debug(f"Firebase: FIREBASE_SERVICE_ACCOUNT_KEY = '{key_value}'")

    # Support both absolute paths and paths relative to the project root
    key_path = key_value if os.path.isabs(key_value) else os.path.join(BASE_DIR, key_value)
    logger.debug(f"Firebase: resolved key path = {key_path}")

    if not os.path.isfile(key_path):
        raise FileNotFoundError(
            f"\n\n❌ Firebase service account key NOT found at:\n   {key_path}\n\n"
            "Fix one of the following in your .env file:\n"
            "  • Set FIREBASE_SERVICE_ACCOUNT_KEY to the correct filename, e.g.:\n"
            "      FIREBASE_SERVICE_ACCOUNT_KEY=order-management-service.json\n"
            "  • Or paste the entire JSON as a single line:\n"
            "      FIREBASE_CREDENTIALS_JSON={\"type\":\"service_account\", ...}\n"
        )

    # (OPTIONAL) Set GOOGLE_APPLICATION_CREDENTIALS for any underlying libraries that rely on ADC
    # We'll skip this to ensure we exclusively use the manual credential passed to initialize_app
    # os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = key_path

    logger.info(f"Firebase: loading credentials from file → {key_path}")
    
    # Manually load and sanitize to avoid "Invalid JWT Signature" 
    # which can be caused by trailing whitespace/newlines in some environments.
    with open(key_path, "r", encoding="utf-8") as f:
        cred_dict = json.load(f)
    
    if "private_key" in cred_dict:
        cred_dict["private_key"] = cred_dict["private_key"].strip()
        
    return credentials.Certificate(cred_dict)


# ─────────────────────────────────────────────
# Initialisation (singleton)
# ─────────────────────────────────────────────
def initialize_firebase() -> firestore.Client:
    """
    Initialise the Firebase Admin SDK exactly once and return a Firestore client.
    Safe to call multiple times — subsequent calls return the cached client.
    """
    global _db

    if _db is not None:
        logger.debug("Firebase: already initialised — returning cached client.")
        return _db

    try:
        if not firebase_admin._apps:
            cred = _resolve_credentials()
            app = firebase_admin.initialize_app(cred)
            logger.info("✅ Firebase Admin SDK initialised successfully.")
        else:
            app = firebase_admin.get_app()
            logger.info("Firebase Admin SDK already initialised — reusing existing app.")

        _db = firestore.client(app=app)
        logger.info("✅ Firestore client ready.")
        return _db

    except (FileNotFoundError, ValueError):
        # Re-raise config errors as-is so the message stays readable
        raise
    except Exception as exc:
        logger.error(f"Unexpected error during Firebase initialisation: {exc}")
        raise RuntimeError(f"Firebase initialisation failed: {exc}") from exc


def get_db() -> firestore.Client:
    """Return the singleton Firestore client, initialising it on first call."""
    global _db
    if _db is None:
        _db = initialize_firebase()
    return _db