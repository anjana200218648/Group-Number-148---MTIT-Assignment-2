from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class OrderSize(str, Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    EXTRA_LARGE = "extra_large"

class VehicleType(str, Enum):
    BIKE = "bike"
    MOTORCYCLE = "motorcycle"
    CAR = "car"
    VAN = "van"
    TRUCK = "truck"

class DeliveryStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    FAILED = "failed"

class DriverStatus(str, Enum):
    OFFLINE = "offline"
    ONLINE = "online"
    BUSY = "busy"
    ON_BREAK = "on_break"

class HotelInfo(BaseModel):
    hotel_id: str
    hotel_name: str
    hotel_cono: str
    address: str
    phone: str
    email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class CustomerInfo(BaseModel):
    name: str
    phone: str
    address: str
    email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class StockItem(BaseModel):
    item_id: str
    item_name: str
    quantity: int = 1
    weight_kg: float = 0
    unit_price: float = 0
    total_price: float = 0

    @validator('total_price', always=True)
    def calculate_total_price(cls, v, values):
        if 'unit_price' in values and 'quantity' in values:
            return values['unit_price'] * values['quantity']
        return v

class Driver(BaseModel):
    driver_id: Optional[str] = None
    name: str
    phone: str
    email: Optional[str] = None
    vehicle_type: VehicleType
    vehicle_number: str
    status: DriverStatus = DriverStatus.OFFLINE
    current_location: Optional[Dict[str, float]] = None
    current_order_id: Optional[str] = None
    total_deliveries_today: int = 0
    total_deliveries_total: int = 0
    rating: float = 5.0
    joined_date: Optional[datetime] = Field(default_factory=datetime.now)
    last_active: Optional[datetime] = None

class DeliveryOrder(BaseModel):
    order_id: Optional[str] = None
    hotel_info: HotelInfo
    customer_info: CustomerInfo
    items: List[StockItem] = []
    order_size: OrderSize = OrderSize.SMALL
    vehicle_type: Optional[VehicleType] = None
    status: DeliveryStatus = DeliveryStatus.PENDING
    estimated_delivery_time: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None
    assigned_driver: Optional[str] = None
    assigned_driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    distance_km: Optional[float] = None
    total_weight_kg: Optional[float] = None
    total_value: Optional[float] = None
    delivery_cost: Optional[float] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)
    tracking_history: List[Dict[str, Any]] = []
    delivery_notes: Optional[str] = None
    signature_required: bool = False
    proof_of_delivery: Optional[str] = None
    customer_signature: Optional[str] = None
    current_location: Optional[Dict[str, float]] = None
    
    @validator('hotel_info', 'customer_info', pre=True)
    def validate_info(cls, v):
        if isinstance(v, dict):
            return v
        return v

class VehicleRequirement(BaseModel):
    order_size: OrderSize
    recommended_vehicle: VehicleType
    max_distance_km: float
    max_weight_kg: float
    min_weight_kg: float = 0
    description: str
    base_cost: float = 50
    cost_per_km: float = 10

class DeliveryUpdate(BaseModel):
    status: DeliveryStatus
    location: Optional[Dict[str, float]] = None
    notes: Optional[str] = None
    proof_of_delivery: Optional[str] = None

class RouteInfo(BaseModel):
    distance_km: float
    duration_minutes: int
    polyline: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None

class TrackingEvent(BaseModel):
    status: DeliveryStatus
    timestamp: str
    location: Optional[Dict[str, float]] = None
    notes: Optional[str] = None
    driver_name: Optional[str] = None

class DeliveryStatistics(BaseModel):
    total_deliveries: int
    status_breakdown: Dict[str, int]
    average_delivery_time_minutes: float
    total_distance_km: float
    on_time_delivery_rate: float
    average_driver_rating: float
    total_revenue: float
    deliveries_by_vehicle: Dict[str, int]
    peak_hours: List[int]

class DriverPerformance(BaseModel):
    driver_id: str
    driver_name: str
    total_deliveries: int
    completed_deliveries: int
    cancelled_deliveries: int
    average_rating: float
    total_distance_km: float
    average_speed_kmh: float
    on_time_rate: float
    earnings: float