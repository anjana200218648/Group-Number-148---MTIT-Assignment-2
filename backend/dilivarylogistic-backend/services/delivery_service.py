import math
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import random
import logging

from geopy.distance import geodesic

from models.delivery import (
    DeliveryOrder, DeliveryStatus, OrderSize, VehicleType, 
    DeliveryUpdate, RouteInfo
)
from services.vehicle_service import VehicleAssignmentService
from services.notification_service import NotificationService

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Import websocket functions
try:
    from services.websocket_service import broadcast_location_update, broadcast_status_update
except ImportError:
    # Define dummy functions if websocket service is not available
    async def broadcast_location_update(order_id: str, location_data: dict):
        pass
    
    async def broadcast_status_update(order_id: str, status_data: dict):
        pass


class MockFirestore:
    """Mock Firestore for development with async support"""
    def __init__(self):
        self.collections = {}
    
    def collection(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection()
        return self.collections[name]


class MockCollection:
    def __init__(self):
        self.documents = {}
    
    def document(self, doc_id):
        if doc_id not in self.documents:
            self.documents[doc_id] = MockDocument(doc_id)
        return self.documents[doc_id]
    
    def where(self, field, op, value):
        return self
    
    def order_by(self, field, direction=None):
        return self
    
    def limit(self, limit):
        return self
    
    def stream(self):
        return list(self.documents.values())


class MockDocument:
    def __init__(self, doc_id):
        self.id = doc_id
        self._data = {}
    
    async def get(self):
        return self
    
    async def set(self, data):
        self._data = data
        return self
    
    async def update(self, data):
        self._data.update(data)
        return self
    
    async def delete(self):
        self._data = {}
        return self
    
    def exists(self):
        return bool(self._data)
    
    def to_dict(self):
        return self._data


class DeliveryService:
    """Delivery Service with Stock Management Integration"""
    
    def __init__(self):
        # Use mock database for development
        self.db = MockFirestore()
        self.collection_name = "deliveries"
        self.location_collection = "delivery_locations"
        self.drivers_collection = "drivers"
        self.notification_service = NotificationService()
        
        # Store deliveries in memory for quick access
        self.deliveries_cache = {}
        
        # Vehicle specifications
        self.VEHICLE_SPECS = {
            VehicleType.BIKE: {'max_weight': 5, 'speed_kmh': 25, 'base_cost': 50, 'cost_per_km': 10},
            VehicleType.MOTORCYCLE: {'max_weight': 15, 'speed_kmh': 30, 'base_cost': 70, 'cost_per_km': 12},
            VehicleType.CAR: {'max_weight': 50, 'speed_kmh': 35, 'base_cost': 100, 'cost_per_km': 15},
            VehicleType.VAN: {'max_weight': 200, 'speed_kmh': 30, 'base_cost': 150, 'cost_per_km': 18},
            VehicleType.TRUCK: {'max_weight': 1000, 'speed_kmh': 25, 'base_cost': 250, 'cost_per_km': 25}
        }
        
        self.PEAK_HOURS = [11, 12, 13, 18, 19, 20]
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in kilometers"""
        try:
            return geodesic((lat1, lon1), (lat2, lon2)).kilometers
        except:
            # Haversine formula fallback
            R = 6371
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return R * c
    
    def calculate_order_weight(self, items: List) -> float:
        total_weight = 0
        for item in items:
            if hasattr(item, 'weight_kg'):
                weight = item.weight_kg
            else:
                weight = item.get('weight_kg', 0)
            
            if hasattr(item, 'quantity'):
                quantity = item.quantity
            else:
                quantity = item.get('quantity', 1)
            
            total_weight += weight * quantity
        return total_weight
    
    def calculate_order_value(self, items: List) -> float:
        total_value = 0
        for item in items:
            if hasattr(item, 'unit_price'):
                price = item.unit_price
            else:
                price = item.get('unit_price', 0)
            
            if hasattr(item, 'quantity'):
                quantity = item.quantity
            else:
                quantity = item.get('quantity', 1)
            
            total_value += price * quantity
        return total_value
    
    def determine_order_size(self, total_weight_kg: float) -> OrderSize:
        if total_weight_kg <= 5:
            return OrderSize.SMALL
        elif total_weight_kg <= 20:
            return OrderSize.MEDIUM
        elif total_weight_kg <= 100:
            return OrderSize.LARGE
        else:
            return OrderSize.EXTRA_LARGE
    
    async def create_delivery(self, order: DeliveryOrder) -> dict:
        """Create a new delivery order"""
        try:
            logger.info(f"Creating delivery order: {order.order_id}")
            
            # Generate order ID if not provided
            if not order.order_id or order.order_id == "":
                order.order_id = f"DEL{datetime.now().strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:4].upper()}"
                logger.info(f"Generated order ID: {order.order_id}")
            
            # Calculate total weight and value
            total_weight = self.calculate_order_weight(order.items)
            total_value = self.calculate_order_value(order.items)
            logger.info(f"Total weight: {total_weight} kg, Total value: {total_value}")
            
            # Determine order size if not provided
            if not order.order_size:
                order.order_size = self.determine_order_size(total_weight)
                logger.info(f"Auto-determined order size: {order.order_size}")
            
            # Get delivery type - handle both string and enum
            delivery_type_value = None
            if order.delivery_type:
                if hasattr(order.delivery_type, 'value'):
                    delivery_type_value = order.delivery_type.value
                else:
                    delivery_type_value = str(order.delivery_type)
            else:
                delivery_type_value = 'customer'  # Default to customer delivery
            
            logger.info(f"Delivery type: {delivery_type_value}")
            
            # Calculate distance based on delivery type
            distance = 0
            if delivery_type_value == 'hotel':
                # For hotel deliveries, we still need coordinates for reference
                if order.hotel_info.latitude and order.hotel_info.longitude:
                    # Set distance to 0 initially - will be calculated when driver location is set
                    distance = 0
                    logger.info(f"Hotel delivery - coordinates available, distance will be calculated dynamically")
                else:
                    logger.warning(f"Hotel delivery but hotel coordinates missing")
            else:
                # For customer deliveries, calculate distance between hotel and customer
                if (order.hotel_info.latitude and order.hotel_info.longitude and 
                    order.customer_info.latitude and order.customer_info.longitude):
                    
                    distance = self.calculate_distance(
                        order.hotel_info.latitude, order.hotel_info.longitude,
                        order.customer_info.latitude, order.customer_info.longitude
                    )
                    logger.info(f"Customer delivery - distance calculated: {distance} km")
                else:
                    logger.warning(f"Customer delivery but coordinates missing")
                    distance = 0
            
            order.distance_km = distance
            
            # Calculate estimated delivery time if distance > 0
            if distance > 0:
                processing_time = {OrderSize.SMALL: 10, OrderSize.MEDIUM: 15, 
                                   OrderSize.LARGE: 20, OrderSize.EXTRA_LARGE: 30}.get(order.order_size, 15)
                travel_time = (distance / 30) * 60
                total_minutes = processing_time + travel_time
                order.estimated_delivery_time = datetime.now() + timedelta(minutes=total_minutes)
                logger.info(f"Estimated delivery time: {order.estimated_delivery_time}")
            
            # Add tracking history
            if not order.tracking_history:
                order.tracking_history = []
            
            order.tracking_history.append({
                "status": order.status.value,
                "timestamp": datetime.now().isoformat(),
                "notes": "Order created"
            })
            
            # Add calculated fields
            order.total_weight_kg = total_weight
            order.total_value = total_value
            
            # Convert to dictionary for storage
            order_dict = order.dict()
            
            # Ensure delivery_type is stored as string
            order_dict["delivery_type"] = delivery_type_value
            order_dict["distance_km"] = distance
            
            # Convert datetime objects to strings for JSON serialization
            if order_dict.get("estimated_delivery_time"):
                if hasattr(order_dict["estimated_delivery_time"], 'isoformat'):
                    order_dict["estimated_delivery_time"] = order_dict["estimated_delivery_time"].isoformat()
            
            order_dict["created_at"] = datetime.now().isoformat()
            order_dict["updated_at"] = datetime.now().isoformat()
            
            # Store in memory cache
            self.deliveries_cache[order.order_id] = order_dict
            logger.info(f"Stored in cache: {order.order_id}")
            
            # Save to mock database
            doc_ref = self.db.collection(self.collection_name).document(order.order_id)
            await doc_ref.set(order_dict)
            logger.info(f"Saved to database: {order.order_id}")
            
            # CREATE INITIAL DRIVER LOCATION (starting at hotel location)
            # Use hotel coordinates as starting point
            initial_lat = order.hotel_info.latitude or 6.9271  # Default Colombo coordinates
            initial_lng = order.hotel_info.longitude or 79.8612
            
            initial_location = {
                "order_id": order.order_id,
                "latitude": initial_lat,
                "longitude": initial_lng,
                "timestamp": datetime.now().isoformat()
            }
            
            # Store initial driver location
            try:
                loc_doc_ref = self.db.collection(self.location_collection).document(order.order_id)
                await loc_doc_ref.set(initial_location)
                logger.info(f"Initial driver location created for order {order.order_id}: ({initial_lat}, {initial_lng})")
            except Exception as loc_err:
                logger.error(f"Error creating initial location: {loc_err}")
            
            return {
                "success": True,
                "order_id": order.order_id,
                "message": "Delivery created successfully",
                "estimated_delivery_time": order.estimated_delivery_time.isoformat() if order.estimated_delivery_time else None
            }
            
        except Exception as e:
            logger.error(f"Error creating delivery: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "message": str(e)}
    
    async def update_delivery_distance(self, order_id: str) -> dict:
        """Update delivery distance based on current driver location"""
        try:
            # Get order data
            result = await self.get_delivery(order_id)
            if not result["success"]:
                return result
            
            order_data = result["data"]
            
            # Get driver location
            loc_doc = await self.db.collection(self.location_collection).document(order_id).get()
            if not loc_doc.exists():
                return {"success": False, "message": "Driver location not available"}
            
            driver_loc = loc_doc.to_dict()
            
            delivery_type = order_data.get("delivery_type", "customer")
            
            # Determine destination based on delivery type and status
            if delivery_type == "hotel":
                dest_lat = order_data.get("hotel_info", {}).get("latitude")
                dest_lng = order_data.get("hotel_info", {}).get("longitude")
            else:
                current_status = order_data.get("status", "")
                if current_status in ["assigned", "pickup", "en_route_to_pickup", "pending"]:
                    dest_lat = order_data.get("hotel_info", {}).get("latitude")
                    dest_lng = order_data.get("hotel_info", {}).get("longitude")
                else:
                    dest_lat = order_data.get("customer_info", {}).get("latitude")
                    dest_lng = order_data.get("customer_info", {}).get("longitude")
            
            if not dest_lat or not dest_lng:
                return {"success": False, "message": "Destination coordinates not available"}
            
            # Calculate distance
            distance = self.calculate_distance(
                driver_loc.get("latitude"),
                driver_loc.get("longitude"),
                dest_lat,
                dest_lng
            )
            
            # Update order with new distance
            order_data["distance_km"] = distance
            self.deliveries_cache[order_id] = order_data
            
            # Update database
            doc_ref = self.db.collection(self.collection_name).document(order_id)
            await doc_ref.update({"distance_km": distance})
            
            logger.info(f"Updated distance for order {order_id}: {distance} km")
            
            return {"success": True, "distance_km": distance}
        except Exception as e:
            logger.error(f"Error updating delivery distance: {e}")
            return {"success": False, "message": str(e)}
    
    async def calculate_distance_from_driver(self, order_id: str) -> dict:
        """Calculate distance from driver location to destination"""
        try:
            order_result = await self.get_delivery(order_id)
            if not order_result["success"]:
                return order_result
            
            order_data = order_result["data"]
            
            # Get driver location
            loc_doc = await self.db.collection(self.location_collection).document(order_id).get()
            if not loc_doc.exists():
                return {"success": False, "message": "Driver location not available"}
            
            driver_loc = loc_doc.to_dict()
            
            delivery_type = order_data.get("delivery_type", "customer")
            
            if delivery_type == "hotel":
                dest_lat = order_data.get("hotel_info", {}).get("latitude")
                dest_lng = order_data.get("hotel_info", {}).get("longitude")
            else:
                # For customer deliveries, check status
                current_status = order_data.get("status", "")
                if current_status in ["assigned", "pickup", "en_route_to_pickup", "pending"]:
                    dest_lat = order_data.get("hotel_info", {}).get("latitude")
                    dest_lng = order_data.get("hotel_info", {}).get("longitude")
                else:
                    dest_lat = order_data.get("customer_info", {}).get("latitude")
                    dest_lng = order_data.get("customer_info", {}).get("longitude")
            
            if dest_lat and dest_lng:
                distance = self.calculate_distance(
                    driver_loc.get("latitude"),
                    driver_loc.get("longitude"),
                    dest_lat,
                    dest_lng
                )
                
                # Update order with new distance
                order_data["distance_km"] = distance
                self.deliveries_cache[order_id] = order_data
                
                # Update database
                doc_ref = self.db.collection(self.collection_name).document(order_id)
                await doc_ref.update({"distance_km": distance})
                
                logger.info(f"Calculated distance from driver for order {order_id}: {distance} km")
                
                return {"success": True, "distance_km": distance}
            
            return {"success": False, "message": "Destination coordinates not available"}
        except Exception as e:
            logger.error(f"Error calculating distance from driver: {e}")
            return {"success": False, "message": str(e)}
    
    async def get_delivery(self, order_id: str) -> dict:
        """Get delivery by order ID"""
        try:
            logger.info(f"Getting delivery: {order_id}")
            
            # Check cache first
            if order_id in self.deliveries_cache:
                logger.info(f"Found in cache: {order_id}")
                return {"success": True, "data": self.deliveries_cache[order_id]}
            
            # Try to get from database
            doc = await self.db.collection(self.collection_name).document(order_id).get()
            if doc.exists():
                data = doc.to_dict()
                # Ensure all required fields are present
                if "delivery_type" not in data:
                    data["delivery_type"] = "customer"
                if "distance_km" not in data:
                    data["distance_km"] = 0
                if "hotel_info" not in data:
                    data["hotel_info"] = {}
                if "customer_info" not in data:
                    data["customer_info"] = {}
                # Update cache
                self.deliveries_cache[order_id] = data
                logger.info(f"Found in database: {order_id}")
                return {"success": True, "data": data}
            else:
                logger.warning(f"Delivery not found: {order_id}")
                return {"success": False, "message": "Delivery not found"}
        except Exception as e:
            logger.error(f"Error getting delivery: {e}")
            return {"success": False, "message": str(e)}
    
    async def update_delivery_status(self, order_id: str, update: DeliveryUpdate) -> dict:
        """Update delivery status"""
        try:
            logger.info(f"Updating status for order {order_id} to {update.status.value}")
            
            doc = await self.db.collection(self.collection_name).document(order_id).get()
            if not doc.exists():
                return {"success": False, "message": "Delivery not found"}
            
            tracking_entry = {
                "status": update.status.value,
                "timestamp": datetime.now().isoformat(),
                "location": update.location,
                "notes": update.notes or f"Status updated to {update.status.value}"
            }
            
            # Get existing tracking history
            existing_data = doc.to_dict()
            tracking_history = existing_data.get("tracking_history", [])
            tracking_history.append(tracking_entry)
            
            update_data = {
                "status": update.status.value,
                "updated_at": datetime.now().isoformat(),
                "tracking_history": tracking_history
            }
            
            # Update in database
            await self.db.collection(self.collection_name).document(order_id).update(update_data)
            
            # Update cache
            if order_id in self.deliveries_cache:
                self.deliveries_cache[order_id].update(update_data)
            
            # After status update, recalculate distance if needed
            if update.status.value in ["picked_up", "out_for_delivery"]:
                await self.update_delivery_distance(order_id)
            
            # Broadcast update
            await broadcast_status_update(order_id, {
                "order_id": order_id,
                "type": "status_change",
                "new_status": update.status.value,
                "notes": update.notes,
                "timestamp": datetime.now().isoformat()
            })
            
            return {"success": True, "message": f"Status updated to {update.status.value}"}
            
        except Exception as e:
            logger.error(f"Error updating status: {e}")
            return {"success": False, "message": str(e)}
    
    async def update_status_with_broadcast(self, order_id: str, update: DeliveryUpdate) -> dict:
        return await self.update_delivery_status(order_id, update)
    
    async def track_delivery(self, order_id: str) -> dict:
        """Track delivery with location info"""
        try:
            result = await self.get_delivery(order_id)
            if not result["success"]:
                return result
            
            data = result["data"]
            
            # Get current location if available
            location_data = None
            try:
                loc_doc = await self.db.collection(self.location_collection).document(order_id).get()
                if loc_doc.exists():
                    location_data = loc_doc.to_dict()
                    logger.info(f"Location data found for {order_id}: {location_data}")
                else:
                    logger.warning(f"No location data found for {order_id}")
            except Exception as e:
                logger.error(f"Error getting location: {e}")
            
            # Get delivery type from data - handle both string and enum
            delivery_type = data.get("delivery_type")
            if isinstance(delivery_type, dict):
                delivery_type = delivery_type.get("value") or delivery_type.get("_value_")
            
            # Ensure delivery_type is set (default to 'customer' for backward compatibility)
            if not delivery_type:
                delivery_type = 'customer'
            
            # Get hotel and customer info safely
            hotel_info = data.get("hotel_info", {})
            customer_info = data.get("customer_info", {})
            
            # Get coordinates with proper None handling
            hotel_lat = hotel_info.get("latitude")
            hotel_lng = hotel_info.get("longitude")
            customer_lat = customer_info.get("latitude")
            customer_lng = customer_info.get("longitude")
            
            hotel_location = {
                "lat": hotel_lat if hotel_lat is not None else None,
                "lng": hotel_lng if hotel_lng is not None else None
            }
            
            customer_location = {
                "lat": customer_lat if customer_lat is not None else None,
                "lng": customer_lng if customer_lng is not None else None
            }
            
            # Get current distance from order data
            total_distance = data.get("distance_km", 0)
            if total_distance is None:
                total_distance = 0
            
            # Get current location with proper formatting
            current_location = None
            if location_data:
                current_location = {
                    "latitude": location_data.get("latitude"),
                    "longitude": location_data.get("longitude")
                }
                logger.info(f"Current location set to: {current_location}")
            
            # Get tracking history
            tracking_history = data.get("tracking_history", [])
            
            tracking_info = {
                "order_id": order_id,
                "current_status": data.get("status", "pending"),
                "estimated_delivery_time": data.get("estimated_delivery_time"),
                "actual_delivery_time": data.get("actual_delivery_time"),
                "tracking_history": tracking_history,
                "hotel_name": hotel_info.get("hotel_name", "Hotel"),
                "customer_name": customer_info.get("name", "Customer"),
                "vehicle_type": data.get("vehicle_type"),
                "distance_km": total_distance,
                "delivery_type": delivery_type,
                "hotel_location": hotel_location,
                "customer_location": customer_location,
                "current_location": current_location,
                "total_distance_km": total_distance
            }
            
            # Add real-time ETA if driver location is available
            if current_location and current_location.get("latitude") and current_location.get("longitude"):
                # Calculate ETA based on delivery type
                if delivery_type == 'hotel':
                    # For hotel deliveries, calculate distance to hotel
                    dest_lat = hotel_location.get("lat")
                    dest_lng = hotel_location.get("lng")
                    eta_description = "hotel"
                else:
                    # For customer deliveries, determine current leg
                    current_status = data.get("status", "")
                    if current_status in ['assigned', 'pickup', 'en_route_to_pickup', 'pending']:
                        # Heading to hotel for pickup
                        dest_lat = hotel_location.get("lat")
                        dest_lng = hotel_location.get("lng")
                        eta_description = "pickup"
                    else:
                        # Heading to customer
                        dest_lat = customer_location.get("lat")
                        dest_lng = customer_location.get("lng")
                        eta_description = "delivery"
                
                if dest_lat and dest_lng:
                    distance_remaining = self.calculate_distance(
                        current_location.get("latitude"),
                        current_location.get("longitude"),
                        dest_lat,
                        dest_lng
                    )
                    
                    # Calculate ETA (assuming 30 km/h average speed)
                    eta_minutes = int((distance_remaining / 30) * 60)
                    
                    # Calculate progress percentage
                    if total_distance > 0:
                        progress = ((total_distance - distance_remaining) / total_distance) * 100
                        if progress < 0:
                            progress = 0
                        elif progress > 100:
                            progress = 100
                    else:
                        progress = 0
                    
                    tracking_info["realtime_eta"] = {
                        "distance_remaining_km": round(distance_remaining, 2),
                        "eta_minutes": eta_minutes,
                        "progress_percentage": round(progress, 2),
                        "is_approaching": distance_remaining < 0.5,
                        "description": eta_description
                    }
            
            return {"success": True, "data": tracking_info}
        except Exception as e:
            logger.error(f"Error tracking delivery: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "message": str(e)}
    
    async def track_delivery_with_location(self, order_id: str) -> dict:
        return await self.track_delivery(order_id)
    
    async def update_driver_location(self, order_id: str, lat: float, lng: float) -> dict:
        try:
            logger.info(f"Updating location for order {order_id}: ({lat}, {lng})")
            
            # Check if location document exists
            doc_ref = self.db.collection(self.location_collection).document(order_id)
            existing_doc = await doc_ref.get()
            
            location_data = {
                "order_id": order_id,
                "latitude": lat,
                "longitude": lng,
                "timestamp": datetime.now().isoformat()
            }
            
            if existing_doc.exists():
                await doc_ref.update(location_data)
                logger.info(f"Updated location for order {order_id}")
            else:
                await doc_ref.set(location_data)
                logger.info(f"Created location for order {order_id}")
            
            # After updating driver location, recalculate distance
            await self.update_delivery_distance(order_id)
            
            return {"success": True, "message": "Location updated", "data": location_data}
        except Exception as e:
            logger.error(f"Error updating location: {e}")
            return {"success": False, "message": str(e)}
    
    async def update_driver_location_realtime(self, order_id: str, lat: float, lng: float) -> dict:
        result = await self.update_driver_location(order_id, lat, lng)
        if result["success"]:
            await broadcast_location_update(order_id, {
                "order_id": order_id,
                "latitude": lat,
                "longitude": lng,
                "timestamp": datetime.now().isoformat()
            })
        return result
    
    async def get_driver_location(self, order_id: str) -> dict:
        try:
            doc = await self.db.collection(self.location_collection).document(order_id).get()
            if doc.exists():
                return {"success": True, "data": doc.to_dict()}
            return {"success": False, "message": "Location not available"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def calculate_realtime_eta(self, order_id: str, lat: float, lng: float) -> dict:
        """Calculate ETA based on current location"""
        result = await self.get_delivery(order_id)
        if not result["success"]:
            return result
        
        data = result["data"]
        customer_lat = data.get("customer_info", {}).get("latitude")
        customer_lng = data.get("customer_info", {}).get("longitude")
        
        if not customer_lat or not customer_lng:
            return {"success": False, "message": "Customer location not available"}
        
        distance = self.calculate_distance(lat, lng, customer_lat, customer_lng)
        eta_minutes = int((distance / 30) * 60)  # 30 km/h average speed
        
        total_distance = data.get("distance_km", distance)
        progress_percentage = ((total_distance - distance) / total_distance * 100) if total_distance > 0 else 0
        
        return {
            "success": True,
            "data": {
                "distance_remaining_km": round(distance, 2),
                "eta_minutes": eta_minutes,
                "progress_percentage": progress_percentage,
                "is_approaching": distance < 0.5
            }
        }
    
    async def get_hotel_deliveries(self, hotel_id: str, limit: Optional[int] = None) -> dict:
        """Get deliveries for a hotel"""
        try:
            # Get all deliveries and filter by hotel_id
            all_deliveries = list(self.deliveries_cache.values())
            hotel_deliveries = [d for d in all_deliveries if d.get("hotel_info", {}).get("hotel_id") == hotel_id]
            
            if limit:
                hotel_deliveries = hotel_deliveries[:limit]
            
            return {"success": True, "data": hotel_deliveries}
        except Exception as e:
            logger.error(f"Error getting hotel deliveries: {e}")
            return {"success": False, "message": str(e), "data": []}
    
    async def get_all_deliveries(self, limit: Optional[int] = None) -> dict:
        """Get all deliveries across all hotels"""
        try:
            all_deliveries = list(self.deliveries_cache.values())
            
            # Sort by created_at descending
            all_deliveries.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            if limit:
                all_deliveries = all_deliveries[:limit]
            
            return {"success": True, "data": all_deliveries}
        except Exception as e:
            logger.error(f"Error getting all deliveries: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "message": str(e), "data": []}
    
    async def delete_delivery(self, order_id: str) -> dict:
        try:
            # Remove from cache
            if order_id in self.deliveries_cache:
                del self.deliveries_cache[order_id]
            
            # Remove from database
            await self.db.collection(self.collection_name).document(order_id).delete()
            
            return {"success": True, "message": "Delivery deleted"}
        except Exception as e:
            logger.error(f"Error deleting delivery: {e}")
            return {"success": False, "message": str(e)}
    
    async def calculate_detailed_estimate_with_driver(
        self, 
        order: DeliveryOrder, 
        driver_latitude: float, 
        driver_longitude: float,
        destination_type: str = "hotel"
    ) -> dict:
        """Calculate detailed delivery estimate from driver location to destination"""
        try:
            # Determine start point (driver location)
            start_lat = driver_latitude
            start_lng = driver_longitude
            
            # Determine end point based on destination type
            if destination_type == "hotel":
                if not order.hotel_info.latitude or not order.hotel_info.longitude:
                    return {"success": False, "message": "Hotel coordinates required for calculation"}
                end_lat = order.hotel_info.latitude
                end_lng = order.hotel_info.longitude
                calculation_type = "driver_to_hotel"
            elif destination_type == "customer":
                if not order.customer_info.latitude or not order.customer_info.longitude:
                    return {"success": False, "message": "Customer coordinates required for calculation"}
                end_lat = order.customer_info.latitude
                end_lng = order.customer_info.longitude
                calculation_type = "driver_to_customer"
            else:
                return {"success": False, "message": "Invalid destination type. Must be 'hotel' or 'customer'"}
            
            # Calculate distance
            distance = self.calculate_distance(start_lat, start_lng, end_lat, end_lng)
            
            # Get vehicle requirements
            vehicle_req = VehicleAssignmentService.get_vehicle_for_order_size(order.order_size)
            
            # Calculate processing time based on order size
            processing_times = {
                OrderSize.SMALL: 10,
                OrderSize.MEDIUM: 15,
                OrderSize.LARGE: 20,
                OrderSize.EXTRA_LARGE: 30
            }
            processing_time = processing_times.get(order.order_size, 15)
            
            # Calculate travel time based on distance (average speed 30 km/h)
            travel_time = (distance / 30) * 60
            
            # Determine if it's peak hour
            current_hour = datetime.now().hour
            is_peak_hour = current_hour in self.PEAK_HOURS
            
            # Determine if it's weekend
            is_weekend = datetime.now().weekday() >= 5
            
            # Traffic and weather multipliers
            traffic_multiplier = 1.2 if is_peak_hour else 1.0
            weather_multiplier = 1.0
            
            # Apply multipliers
            adjusted_travel_time = travel_time * traffic_multiplier * weather_multiplier
            
            # Calculate total minutes
            total_minutes = processing_time + adjusted_travel_time
            
            # Calculate estimated delivery time
            estimated_delivery_time = datetime.now() + timedelta(minutes=total_minutes)
            
            # Prepare detailed breakdown
            breakdown = {
                "order_processing": f"{processing_time} min",
                "warehouse_queue": "5 min",
                "travel_time": f"{int(travel_time)} min",
                "traffic_multiplier": traffic_multiplier,
                "weather_multiplier": weather_multiplier,
                "is_peak_hour": is_peak_hour,
                "is_weekend": is_weekend,
                "adjusted_travel_time": f"{int(adjusted_travel_time)} min"
            }
            
            return {
                "success": True,
                "data": {
                    "distance_km": round(distance, 2),
                    "recommended_vehicle": vehicle_req.recommended_vehicle.value if vehicle_req else None,
                    "estimated_delivery_time": estimated_delivery_time.isoformat(),
                    "estimated_minutes": int(total_minutes),
                    "breakdown": breakdown,
                    "calculation_type": calculation_type
                }
            }
        except Exception as e:
            logger.error(f"Error calculating detailed estimate with driver: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "message": str(e)}
    
    async def calculate_detailed_estimate(self, order: DeliveryOrder) -> dict:
        """Calculate detailed delivery estimate from hotel to customer"""
        try:
            if not order.hotel_info.latitude or not order.hotel_info.longitude:
                return {"success": False, "message": "Hotel coordinates required"}
            
            if not order.customer_info.latitude or not order.customer_info.longitude:
                return {"success": False, "message": "Customer coordinates required"}
            
            distance = self.calculate_distance(
                order.hotel_info.latitude, order.hotel_info.longitude,
                order.customer_info.latitude, order.customer_info.longitude
            )
            
            vehicle_req = VehicleAssignmentService.get_vehicle_for_order_size(order.order_size)
            
            # Calculate processing time based on order size
            processing_times = {
                OrderSize.SMALL: 10,
                OrderSize.MEDIUM: 15,
                OrderSize.LARGE: 20,
                OrderSize.EXTRA_LARGE: 30
            }
            processing_time = processing_times.get(order.order_size, 15)
            
            # Calculate travel time (average speed 30 km/h)
            travel_time = (distance / 30) * 60
            
            # Determine if it's peak hour
            current_hour = datetime.now().hour
            is_peak_hour = current_hour in self.PEAK_HOURS
            
            # Determine if it's weekend
            is_weekend = datetime.now().weekday() >= 5
            
            # Traffic and weather multipliers
            traffic_multiplier = 1.2 if is_peak_hour else 1.0
            weather_multiplier = 1.0
            
            # Apply multipliers
            adjusted_travel_time = travel_time * traffic_multiplier * weather_multiplier
            
            # Calculate total minutes
            total_minutes = processing_time + adjusted_travel_time
            
            # Calculate estimated delivery time
            estimated_delivery_time = datetime.now() + timedelta(minutes=total_minutes)
            
            # Prepare detailed breakdown
            breakdown = {
                "order_processing": f"{processing_time} min",
                "warehouse_queue": "5 min",
                "travel_time": f"{int(travel_time)} min",
                "traffic_multiplier": traffic_multiplier,
                "weather_multiplier": weather_multiplier,
                "is_peak_hour": is_peak_hour,
                "is_weekend": is_weekend,
                "adjusted_travel_time": f"{int(adjusted_travel_time)} min"
            }
            
            return {
                "success": True,
                "data": {
                    "distance_km": round(distance, 2),
                    "recommended_vehicle": vehicle_req.recommended_vehicle.value if vehicle_req else None,
                    "estimated_delivery_time": estimated_delivery_time.isoformat(),
                    "estimated_minutes": int(total_minutes),
                    "breakdown": breakdown,
                    "calculation_type": "hotel_to_customer"
                }
            }
        except Exception as e:
            logger.error(f"Error calculating detailed estimate: {e}")
            return {"success": False, "message": str(e)}
    
    async def calculate_delivery_estimate(self, order: DeliveryOrder) -> dict:
        return await self.calculate_detailed_estimate(order)
    
    async def get_delivery_statistics(self, hotel_id: Optional[str] = None) -> dict:
        """Get delivery statistics"""
        try:
            deliveries = list(self.deliveries_cache.values())
            
            if hotel_id:
                deliveries = [d for d in deliveries if d.get("hotel_info", {}).get("hotel_id") == hotel_id]
            
            total_deliveries = len(deliveries)
            
            # Calculate status breakdown
            status_breakdown = {}
            for delivery in deliveries:
                status = delivery.get("status", "pending")
                status_breakdown[status] = status_breakdown.get(status, 0) + 1
            
            # Calculate average delivery time for completed deliveries
            completed_deliveries = [d for d in deliveries if d.get("status") == "delivered"]
            total_delivery_time = 0
            for delivery in completed_deliveries:
                if delivery.get("estimated_delivery_time") and delivery.get("actual_delivery_time"):
                    try:
                        estimated = datetime.fromisoformat(delivery["estimated_delivery_time"])
                        actual = datetime.fromisoformat(delivery["actual_delivery_time"])
                        total_delivery_time += (actual - estimated).total_seconds() / 60
                    except:
                        pass
            
            avg_delivery_time = total_delivery_time / len(completed_deliveries) if completed_deliveries else 0
            
            # Calculate total distance - FIX: Handle None values
            total_distance = 0
            for d in deliveries:
                distance = d.get("distance_km")
                if distance is not None:
                    total_distance += distance
            
            return {
                "success": True,
                "data": {
                    "total_deliveries": total_deliveries,
                    "status_breakdown": status_breakdown,
                    "average_delivery_time_minutes": round(avg_delivery_time, 2),
                    "total_distance_km": round(total_distance, 2),
                    "on_time_delivery_rate": 0,
                    "average_driver_rating": 0,
                    "total_revenue": 0,
                    "deliveries_by_vehicle": {},
                    "peak_hours": []
                }
            }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False, 
                "message": str(e),
                "data": {
                    "total_deliveries": 0,
                    "status_breakdown": {},
                    "average_delivery_time_minutes": 0,
                    "total_distance_km": 0,
                    "on_time_delivery_rate": 0,
                    "average_driver_rating": 0,
                    "total_revenue": 0,
                    "deliveries_by_vehicle": {},
                    "peak_hours": []
                }
            }
    
    def estimate_delivery_time(self, distance_km: float, order_size: OrderSize) -> datetime:
        processing_time = {OrderSize.SMALL: 10, OrderSize.MEDIUM: 15, 
                          OrderSize.LARGE: 20, OrderSize.EXTRA_LARGE: 30}.get(order_size, 15)
        travel_time = (distance_km / 30) * 60
        total_minutes = processing_time + travel_time
        return datetime.now() + timedelta(minutes=total_minutes)