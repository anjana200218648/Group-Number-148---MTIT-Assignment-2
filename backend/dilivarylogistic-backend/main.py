from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes import delivery_routes
from services.websocket_service import sio, socket_app
from utils.firebase_client import firebase_client
import uvicorn
from datetime import datetime
import socketio

app = FastAPI(
    title="Delivery Logistics Microservice",
    version="2.0.0",
    description="Real-time delivery tracking system with WebSocket support"
)

# Configure CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase (the singleton will initialize when first called)
try:
    db = firebase_client.get_db()
    firebase_status = "connected"
    print(" Firebase connected successfully")
except Exception as e:
    firebase_status = f"error: {str(e)}"
    print(f" Firebase connection failed: {e}")

# Include REST API routers
app.include_router(delivery_routes.router)

# Mount Socket.IO WebSocket server - IMPORTANT: This must be mounted before the root endpoint
# The socket_app should be an ASGI app that handles WebSocket connections
app.mount("/socket.io", socket_app)

@app.get("/")
async def root():
    return {
        "message": "Delivery Logistics Microservice API",
        "version": "2.0.0",
        "status": "running",
        "websocket_url": "/socket.io",
        "firebase_status": firebase_status if 'firebase_status' in locals() else "not initialized",
        "features": [
            "Real-time location tracking",
            "WebSocket updates",
            "Dynamic ETA calculation",
            "Vehicle assignment",
            "Delivery statistics",
            "Live map integration"
        ],
        "websocket_endpoint": "/socket.io",
        "api_endpoints": {
            "create_delivery": "POST /api/v1/delivery/orders",
            "track_delivery": "GET /api/v1/delivery/orders/{order_id}/track",
            "update_location": "POST /api/v1/delivery/location/update",
            "get_statistics": "GET /api/v1/delivery/statistics"
        }
    }

@app.get("/health")
async def health_check():
    # Test Firebase connection
    firebase_health = "unknown"
    try:
        # Try to access Firebase
        db = firebase_client.get_db()
        # Simple test query (optional - remove if you don't want to write data)
        test_ref = db.collection('_health_check').document('test')
        test_ref.set({'timestamp': datetime.now().isoformat()})
        firebase_health = "connected"
    except Exception as e:
        firebase_health = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "websocket": "connected",
        "firebase": firebase_health,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/socket-test")
async def socket_test():
    return {
        "message": "Socket.IO is available at /socket.io",
        "connection_url": "http://localhost:8084/socket.io",
        "websocket_endpoint": "ws://localhost:8084/socket.io"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8084,
        reload=True,
        log_level="info",
        reload_dirs=["."],
        ws="auto"  # Ensure WebSocket support is enabled
    )