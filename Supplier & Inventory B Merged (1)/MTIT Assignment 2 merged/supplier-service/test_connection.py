from app.config.firebase_config import db, firebase_auth

print("Testing your Firebase connection...")

try:
    # Test Firestore
    test_ref = db.collection('test').document('test')
    test_ref.set({
        'message': 'Your Firebase is working!',
        'timestamp': '2024-03-25'
    })
    print("✅ Firestore connection successful!")
    
    # Read test
    doc = test_ref.get()
    if doc.exists:
        print(f"✅ Data read successful: {doc.to_dict()}")
    
    print("\n🎉 Your Firebase setup is complete!")
    print("You can now run your API: python run.py")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nPlease check:")
    print("1. firebase-credentials.json is in the correct folder")
    print("2. Firestore database is created")
    print("3. Authentication is enabled")