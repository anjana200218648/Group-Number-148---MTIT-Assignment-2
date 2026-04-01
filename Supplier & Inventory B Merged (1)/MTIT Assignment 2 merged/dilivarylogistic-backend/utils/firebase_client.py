import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

class FirebaseClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        try:
            # Check if already initialized
            if not firebase_admin._apps:
                # Try to get credentials from environment variable or file
                cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "delivery-and-logistic-mservice-firebase-adminsdk-fbsvc-22638a4175.json")
                
                if not os.path.exists(cred_path):
                    # Try to get from environment variable as JSON string
                    firebase_creds = os.getenv("FIREBASE_CREDENTIALS")
                    if firebase_creds:
                        # Write to temporary file
                        cred_path = "/tmp/firebase-credentials.json"
                        with open(cred_path, 'w') as f:
                            f.write(firebase_creds)
                
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    print(f"Firebase initialized successfully with credentials from {cred_path}")
                else:
                    # For development, use default credentials
                    print("No Firebase credentials found, using default credentials")
                    firebase_admin.initialize_app()
                
                self.db = firestore.client()
            else:
                self.db = firestore.client()
                
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            # Create a dummy client for development without Firebase
            self.db = None
            raise e
    
    def get_db(self):
        if self.db is None:
            raise Exception("Firebase not initialized")
        return self.db

# Singleton instance
firebase_client = FirebaseClient()