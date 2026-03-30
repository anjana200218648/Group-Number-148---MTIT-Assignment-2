from app.config.firebase_config import db

print("Testing Firestore connection...")

# Test adding a document
try:
    test_ref = db.collection('test').document('connection_test')
    test_ref.set({
        'message': 'Firebase connection successful!',
        'timestamp': '2024-03-25',
        'status': 'working'
    })
    print("✅ Successfully wrote to Firestore!")
    
    # Test reading the document
    doc = test_ref.get()
    if doc.exists:
        print(f"✅ Successfully read from Firestore: {doc.to_dict()}")
    else:
        print("❌ Document not found")
        
except Exception as e:
    print(f"❌ Firestore error: {e}")

print("Firestore test complete!")