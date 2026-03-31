from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from enum import Enum
from datetime import datetime


class OrderStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    DISPATCHED = "Dispatched"
    DELIVERED = "Delivered"
    CANCELLED = "Cancelled"


# Valid status transitions
VALID_TRANSITIONS = {
    OrderStatus.PENDING: [OrderStatus.APPROVED, OrderStatus.CANCELLED],
    OrderStatus.APPROVED: [OrderStatus.DISPATCHED, OrderStatus.CANCELLED],
    OrderStatus.DISPATCHED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    OrderStatus.DELIVERED: [],
    OrderStatus.CANCELLED: [],
}


class OrderItem(BaseModel):
    name: str = Field(..., min_length=1, description="Item name")
    quantity: int = Field(..., gt=0, description="Item quantity (must be > 0)")
    price: float = Field(..., gt=0, description="Item unit price (must be > 0)")

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Item name cannot be blank")
        return v.strip()


class StatusHistoryEntry(BaseModel):
    from_status: Optional[str] = None
    to_status: str
    changed_at: str
    note: Optional[str] = None


class OrderCreate(BaseModel):
    restaurant_id: str = Field(..., min_length=1, description="Restaurant identifier")
    supplier_id: str = Field(..., min_length=1, description="Supplier identifier")
    items: List[OrderItem] = Field(..., min_length=1, description="List of order items (at least 1 required)")

    @field_validator("items")
    @classmethod
    def items_must_not_be_empty(cls, v: List[OrderItem]) -> List[OrderItem]:
        if not v:
            raise ValueError("Order must have at least one item")
        return v


class OrderUpdate(BaseModel):
    items: Optional[List[OrderItem]] = None
    restaurant_id: Optional[str] = None
    supplier_id: Optional[str] = None


class StatusUpdate(BaseModel):
    new_status: OrderStatus = Field(..., description="New order status")
    note: Optional[str] = Field(None, description="Optional note for status change")


class OrderResponse(BaseModel):
    order_id: str
    restaurant_id: str
    supplier_id: str
    items: List[OrderItem]
    total_price: float
    status: OrderStatus
    status_history: List[StatusHistoryEntry] = []
    created_at: str
    updated_at: str

    model_config = {
        "from_attributes": True,
        "use_enum_values": True
    }


class OrderListResponse(BaseModel):
    total: int
    orders: List[OrderResponse]


class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict | list] = None
