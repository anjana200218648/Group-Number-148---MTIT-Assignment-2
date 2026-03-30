from fastapi import APIRouter, HTTPException, Query
from services.delivery_service import DeliveryService
from services.vehicle_service import VehicleAssignmentService
from models.delivery import DeliveryOrder, DeliveryUpdate, OrderSize
from typing import Optional
import uuid
from datetime import datetime, timedelta  # Added timedelta
from firebase_admin import firestore

router = APIRouter(prefix="/api/v1/delivery", tags=["delivery"])
delivery_service = DeliveryService()

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
    
# Single version of calculate-detailed endpoint
@router.post("/orders/calculate-detailed")
async def calculate_detailed_estimate(order: DeliveryOrder):
    """Calculate detailed delivery estimate with breakdown"""
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
        
        # Calculate distance
        distance = delivery_service.calculate_distance(
            order.hotel_info.latitude, order.hotel_info.longitude,
            order.customer_info.latitude, order.customer_info.longitude
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
        
        # Calculate travel time (average speed 30 km/h)
        travel_time = (distance / 30) * 60
        
        # Determine if it's peak hour
        current_hour = datetime.now().hour
        is_peak_hour = current_hour in [11, 12, 13, 18, 19, 20]
        
        # Determine if it's weekend
        is_weekend = datetime.now().weekday() >= 5
        
        # Traffic and weather multipliers
        traffic_multiplier = 1.2 if is_peak_hour else 1.0
        weather_multiplier = 1.0  # Could be dynamic based on weather API
        
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
                "recommended_vehicle": vehicle_req.recommended_vehicle if vehicle_req else None,
                "estimated_delivery_time": estimated_delivery_time.isoformat(),
                "estimated_minutes": int(total_minutes),
                "breakdown": breakdown
            }
        }
    except Exception as e:
        print(f"Error in calculate detailed estimate: {e}")
        raise HTTPException(status_code=400, detail=str(e))