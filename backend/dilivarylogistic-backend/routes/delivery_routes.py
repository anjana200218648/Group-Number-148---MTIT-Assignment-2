from fastapi import APIRouter, HTTPException, Query, Body
from services.delivery_service import DeliveryService
from services.vehicle_service import VehicleAssignmentService
from models.delivery import DeliveryOrder, DeliveryUpdate, OrderSize
from typing import Optional
import uuid
import logging
from datetime import datetime, timedelta
from firebase_admin import firestore
from pydantic import BaseModel

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/delivery", tags=["delivery"])
delivery_service = DeliveryService()

# Define request models for location updates
class LocationUpdateRequest(BaseModel):
    order_id: str
    latitude: float
    longitude: float

@router.post("/orders")
async def create_delivery_order(order: DeliveryOrder):
    """Create a new delivery order"""
    # Generate order ID if not provided
    if not order.order_id or order.order_id == "":
        order.order_id = f"DEL{datetime.now().strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:4].upper()}"
    
    result = await delivery_service.create_delivery(order)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("/orders/{order_id}")
async def get_delivery(order_id: str):
    """Get delivery details by order ID"""
    result = await delivery_service.get_delivery(order_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result

@router.put("/orders/{order_id}/status")
async def update_delivery_status(order_id: str, update: DeliveryUpdate):
    """Update delivery status"""
    result = await delivery_service.update_delivery_status(order_id, update)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.delete("/orders/{order_id}")
async def delete_delivery(order_id: str):
    """Delete a delivery order by ID"""
    result = await delivery_service.delete_delivery(order_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result

@router.get("/orders/{order_id}/track")
async def track_delivery(order_id: str):
    """Track delivery in real-time"""
    result = await delivery_service.track_delivery(order_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result

@router.get("/hotel/{hotel_id}/deliveries")
async def get_hotel_deliveries(hotel_id: str):
    """Get all deliveries for a specific hotel"""
    result = await delivery_service.get_hotel_deliveries(hotel_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("/all-deliveries")
async def get_all_deliveries(limit: Optional[int] = None):
    """Get all deliveries across all hotels"""
    result = await delivery_service.get_all_deliveries(limit)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("/vehicle-requirements")
async def get_vehicle_requirements(order_size: Optional[OrderSize] = None):
    """Get vehicle requirements based on order size"""
    if order_size:
        requirement = VehicleAssignmentService.get_vehicle_for_order_size(order_size)
        if requirement:
            return {"success": True, "data": requirement.dict()}
        else:
            raise HTTPException(status_code=404, detail="Order size not found")
    else:
        requirements = VehicleAssignmentService.get_all_vehicle_requirements()
        return {"success": True, "data": {k.value: v.dict() for k, v in requirements.items()}}

@router.get("/statistics")
async def get_delivery_statistics(hotel_id: Optional[str] = None):
    """Get delivery statistics"""
    result = await delivery_service.get_delivery_statistics(hotel_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/orders/calculate")
async def calculate_delivery_estimate(order: DeliveryOrder):
    """Calculate delivery estimate without creating order"""
    try:
        # Check if coordinates are provided
        if not order.hotel_info.latitude or not order.hotel_info.longitude:
            return {
                "success": False,
                "message": "Hotel coordinates are required for calculation"
            }
        
        if not order.customer_info.latitude or not order.customer_info.longitude:
            return {
                "success": False,
                "message": "Customer coordinates are required for calculation"
            }
        
        distance = delivery_service.calculate_distance(
            order.hotel_info.latitude, order.hotel_info.longitude,
            order.customer_info.latitude, order.customer_info.longitude
        )
        
        vehicle_req = VehicleAssignmentService.get_vehicle_for_order_size(order.order_size)
        if vehicle_req:
            estimated_time = delivery_service.estimate_delivery_time(distance, order.order_size)
            
            return {
                "success": True,
                "data": {
                    "distance_km": round(distance, 2),
                    "recommended_vehicle": vehicle_req.recommended_vehicle,
                    "estimated_delivery_time": estimated_time.isoformat(),
                    "estimated_minutes": round((estimated_time - datetime.now()).total_seconds() / 60, 2)
                }
            }
        else:
            return {
                "success": False,
                "message": "Invalid order size"
            }
    except Exception as e:
        print(f"Error in calculate: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    
# Updated calculate-detailed endpoint with driver location support
@router.post("/orders/calculate-detailed")
async def calculate_detailed_estimate(
    request: dict  # Accept raw JSON to handle extra fields
):
    """Calculate detailed delivery estimate from driver location to destination"""
    try:
        # Extract driver location and destination type from request
        driver_latitude = request.get('driver_location', {}).get('latitude')
        driver_longitude = request.get('driver_location', {}).get('longitude')
        destination_type = request.get('destination_type')
        
        # Parse the order data
        order = DeliveryOrder(**request)
        
        # Determine start point (driver location)
        if driver_latitude is None or driver_longitude is None:
            return {
                "success": False,
                "message": "Driver location coordinates are required for calculation"
            }
        
        start_lat = driver_latitude
        start_lng = driver_longitude
        
        # Determine end point based on destination type
        if destination_type == "hotel":
            if not order.hotel_info.latitude or not order.hotel_info.longitude:
                return {
                    "success": False,
                    "message": "Hotel coordinates are required for calculation"
                }
            end_lat = order.hotel_info.latitude
            end_lng = order.hotel_info.longitude
            calculation_type = "driver_to_hotel"
        elif destination_type == "customer":
            if not order.customer_info.latitude or not order.customer_info.longitude:
                return {
                    "success": False,
                    "message": "Customer coordinates are required for calculation"
                }
            end_lat = order.customer_info.latitude
            end_lng = order.customer_info.longitude
            calculation_type = "driver_to_customer"
        else:
            # Default to hotel if no destination type specified
            if not order.hotel_info.latitude or not order.hotel_info.longitude:
                return {
                    "success": False,
                    "message": "Hotel coordinates are required for calculation"
                }
            end_lat = order.hotel_info.latitude
            end_lng = order.hotel_info.longitude
            calculation_type = "driver_to_hotel"
        
        # Calculate distance
        distance = delivery_service.calculate_distance(
            start_lat, start_lng,
            end_lat, end_lng
        )
        
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
        is_peak_hour = current_hour in [11, 12, 13, 18, 19, 20]
        
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
        print(f"Error in calculate detailed estimate: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

# ==================== LOCATION MANAGEMENT ====================

@router.post("/location/update")
async def update_driver_location(request: LocationUpdateRequest):
    """Update driver's current location for a delivery order"""
    try:
        result = await delivery_service.update_driver_location(
            request.order_id, 
            request.latitude, 
            request.longitude
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating driver location: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/location/{order_id}")
async def get_driver_location(order_id: str):
    """Get driver's current location for a delivery order"""
    try:
        result = await delivery_service.get_driver_location(order_id)
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting driver location: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/location/calculate-distance/{order_id}")
async def calculate_distance_from_driver(order_id: str):
    """Calculate and update distance from driver location to destination"""
    try:
        result = await delivery_service.calculate_distance_from_driver(order_id)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating distance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DEBUG ENDPOINTS ====================

@router.get("/debug/locations")
async def debug_get_all_locations():
    """Debug endpoint to get all stored locations"""
    try:
        locations = []
        # Get all documents from location collection
        docs = await delivery_service.db.collection(delivery_service.location_collection).get()
        for doc in docs:
            locations.append(doc.to_dict())
        return {"success": True, "data": locations}
    except Exception as e:
        logger.error(f"Error getting locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug/deliveries")
async def debug_get_all_deliveries():
    """Debug endpoint to get all deliveries"""
    try:
        return {"success": True, "data": list(delivery_service.deliveries_cache.values())}
    except Exception as e:
        logger.error(f"Error getting deliveries: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health/details")
async def health_check_details():
    """Detailed health check endpoint"""
    try:
        locations_count = 0
        try:
            docs = await delivery_service.db.collection(delivery_service.location_collection).get()
            locations_count = len(docs)
        except:
            pass
            
        return {
            "success": True,
            "status": "healthy",
            "deliveries_count": len(delivery_service.deliveries_cache),
            "locations_count": locations_count
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }