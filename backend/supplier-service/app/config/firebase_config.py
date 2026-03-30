import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from dotenv import load_dotenv

load_dotenv()

class FirebaseConfig:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize Firebase Admin SDK"""
        if not firebase_admin._apps:
            cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')
            
            # Check if credentials file exists
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print(f"✅ Firebase initialized with credentials from {cred_path}")
            else:
                print(f"❌ Error: Firebase credentials file {cred_path} not found!")
                print("Please make sure firebase-credentials.json exists in the project root")
                raise FileNotFoundError(f"Firebase credentials file not found: {cred_path}")
        
        self.db = firestore.client()
        self.auth = auth
        print("✅ Firebase Firestore and Auth are ready")
    
    def get_db(self):
        """Get Firestore database instance"""
        return self.db
    
    def get_auth(self):
        """Get Firebase Auth instance"""
        return self.auth

# Singleton instance
firebase_config = FirebaseConfig()
db = firebase_config.get_db()
firebase_auth = firebase_config.get_auth()