from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum

class DeliveryStatus(str, Enum):
    ON_TIME = "on_time"
    DELAYED = "delayed"
    EARLY = "early"

class PerformanceMetric(BaseModel):
    supplier_id: Optional[str] = None  # ← Made optional (set by route)
    order_id: str
    delivery_time_actual: datetime
    delivery_time_expected: datetime
    delivery_status: DeliveryStatus
    quality_rating: int  # 1-5
    comments: Optional[str] = None
    recorded_at: datetime = Field(default_factory=datetime.now)

class SupplierPerformanceScore(BaseModel):
    supplier_id: str
    overall_score: float  # 0-100
    on_time_score: float  # 0-100
    quality_score: float  # 0-100
    total_orders: int
    on_time_orders: int
    average_quality_rating: float
    last_updated: datetime = Field(default_factory=datetime.now)