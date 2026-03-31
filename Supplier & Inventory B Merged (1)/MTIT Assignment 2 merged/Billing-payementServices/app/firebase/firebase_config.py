import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_db = None
_use_mock = False


def get_firestore_client():
    """Returns the Firestore client (real or mock)."""
    global _db, _use_mock

    if _db is not None:
        return _db

    # Try to initialize real Firebase
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase_credentials.json")
    project_id = os.getenv("FIREBASE_PROJECT_ID", "")

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase initialized with service account credentials.")
            elif project_id:
                # Use application default credentials
                firebase_admin.initialize_app(options={"projectId": project_id})
                logger.info("Firebase initialized with application default credentials.")
            else:
                raise ValueError("No Firebase credentials found.")

        _db = firestore.client()
        _use_mock = False
        logger.info("Firestore client initialized successfully.")
        return _db

    except Exception as e:
        logger.warning(f"Firebase initialization failed: {e}. Using mock database.")
        _use_mock = True
        _db = MockFirestoreClient()
        return _db


def is_using_mock() -> bool:
    return _use_mock


# -------------------------------------------------------------------
# Mock Firestore for local development without Firebase credentials
# -------------------------------------------------------------------

class MockDocument:
    def __init__(self, doc_id: str, data: dict):
        self.id = doc_id
        self._data = data

    def to_dict(self) -> dict:
        return {**self._data, "id": self.id}

    @property
    def exists(self) -> bool:
        return self._data is not None


class MockCollection:
    def __init__(self, name: str, store: dict):
        self._name = name
        self._store = store  # shared dict reference

    def document(self, doc_id: str):
        return MockDocumentRef(doc_id, self._store, self._name)

    def stream(self):
        items = self._store.get(self._name, {})
        return [MockDocument(k, v) for k, v in items.items()]

    def where(self, field: str, op: str, value):
        return MockQuery(self._name, self._store, field, op, value)

    def add(self, data: dict):
        import uuid
        doc_id = str(uuid.uuid4())[:8].upper()
        if self._name not in self._store:
            self._store[self._name] = {}
        self._store[self._name][doc_id] = data
        return None, MockDocumentRef(doc_id, self._store, self._name)


class MockDocumentRef:
    def __init__(self, doc_id: str, store: dict, collection_name: str):
        self.id = doc_id
        self._store = store
        self._collection = collection_name

    def get(self):
        data = self._store.get(self._collection, {}).get(self.id)
        return MockDocument(self.id, data) if data is not None else MockDocument(self.id, None)

    def set(self, data: dict):
        if self._collection not in self._store:
            self._store[self._collection] = {}
        self._store[self._collection][self.id] = data

    def update(self, data: dict):
        if self._collection in self._store and self.id in self._store[self._collection]:
            self._store[self._collection][self.id].update(data)

    def delete(self):
        if self._collection in self._store:
            self._store[self._collection].pop(self.id, None)

    @property
    def exists(self):
        return self.id in self._store.get(self._collection, {})


class MockQuery:
    def __init__(self, collection_name: str, store: dict, field: str, op: str, value):
        self._collection = collection_name
        self._store = store
        self._field = field
        self._op = op
        self._value = value

    def stream(self):
        items = self._store.get(self._collection, {})
        result = []
        for doc_id, data in items.items():
            val = data.get(self._field)
            if self._op == "==" and val == self._value:
                result.append(MockDocument(doc_id, data))
            elif self._op == ">=" and val is not None and val >= self._value:
                result.append(MockDocument(doc_id, data))
            elif self._op == "<=" and val is not None and val <= self._value:
                result.append(MockDocument(doc_id, data))
        return result


_MOCK_STORE: dict = {}


class MockFirestoreClient:
    def collection(self, name: str):
        return MockCollection(name, _MOCK_STORE)
