# services/websocket_service.py

import asyncio
import json
from typing import Dict, Set
import socketio
from datetime import datetime

# Create Socket.IO server with proper configuration
sio = socketio.AsyncServer(
    cors_allowed_origins='*',
    async_mode='asgi',
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)

# Create the ASGI app with explicit socket.io path
socket_app = socketio.ASGIApp(sio, socketio_path='socket.io')

# Store active connections
active_connections: Dict[str, Set[str]] = {}
driver_connections: Dict[str, str] = {}
hotel_connections: Dict[str, Set[str]] = {}

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    return {"status": "connected", "sid": sid}

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    # Remove from all tracking rooms
    for order_id, connections in list(active_connections.items()):
        if sid in connections:
            connections.discard(sid)
            if len(connections) == 0:
                del active_connections[order_id]
    
    for driver_id, connection_sid in list(driver_connections.items()):
        if connection_sid == sid:
            del driver_connections[driver_id]
    
    for hotel_id, connections in list(hotel_connections.items()):
        if sid in connections:
            connections.discard(sid)

@sio.event
async def join_order(sid, data):
    order_id = data.get('order_id')
    if order_id:
        if order_id not in active_connections:
            active_connections[order_id] = set()
        active_connections[order_id].add(sid)
        await sio.enter_room(sid, order_id)
        print(f"Client {sid} joined order {order_id}")
        return {"success": True, "message": f"Joined order {order_id}"}
    return {"success": False, "message": "Order ID required"}

@sio.event
async def leave_order(sid, data):
    order_id = data.get('order_id')
    if order_id and order_id in active_connections:
        active_connections[order_id].discard(sid)
        await sio.leave_room(sid, order_id)
        return {"success": True, "message": f"Left order {order_id}"}
    return {"success": False, "message": "Order ID not found"}

@sio.event
async def register_driver(sid, data):
    driver_id = data.get('driver_id')
    if driver_id:
        driver_connections[driver_id] = sid
        await sio.enter_room(sid, f"driver_{driver_id}")
        return {"success": True, "message": f"Driver {driver_id} registered"}
    return {"success": False, "message": "Driver ID required"}

@sio.event
async def register_hotel(sid, data):
    hotel_id = data.get('hotel_id')
    if hotel_id:
        if hotel_id not in hotel_connections:
            hotel_connections[hotel_id] = set()
        hotel_connections[hotel_id].add(sid)
        await sio.enter_room(sid, f"hotel_{hotel_id}")
        return {"success": True, "message": f"Hotel {hotel_id} registered"}
    return {"success": False, "message": "Hotel ID required"}

@sio.event
async def ping(sid, data):
    """Handle ping from client"""
    return {"pong": True, "timestamp": datetime.now().isoformat()}

async def broadcast_location_update(order_id: str, location_data: dict):
    if order_id in active_connections:
        await sio.emit('location_update', location_data, room=order_id)
        print(f"Broadcasted location update for order {order_id}")

async def broadcast_status_update(order_id: str, status_data: dict):
    if order_id in active_connections:
        await sio.emit('status_update', status_data, room=order_id)
        print(f"Broadcasted status update for order {order_id}")

async def broadcast_eta_update(order_id: str, eta_data: dict):
    if order_id in active_connections:
        await sio.emit('eta_update', eta_data, room=order_id)