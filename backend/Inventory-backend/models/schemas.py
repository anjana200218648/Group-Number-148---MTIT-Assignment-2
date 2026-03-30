from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class ItemBase(BaseModel):
    name: str
    price: float = Field(..., gt=0, description="Unit price (must be > 0)")
    quantity: int = Field(..., ge=0, description="Stock quantity (must be >= 0)")
    image_url: Optional[str] = None
    expiry_date: Optional[str] = None
    supplier_id: str

class ItemCreate(ItemBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Bratwurst Sausages Pack",
                "price": 12.50,
                "quantity": 50,
                "image_url": "https://example.com/images/bratwurst.png",
                "expiry_date": "2024-12-31",
                "supplier_id": "supp_12345"
            }
        }
    )

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    image_url: Optional[str] = None
    expiry_date: Optional[str] = None
    supplier_id: Optional[str] = None


class ItemStockUpdate(BaseModel):
    """
    Update endpoint is restricted to stock pricing + quantity.
    This keeps authorization/business rules straightforward and Swagger consistent.
    """
    price: float = Field(..., gt=0)
    quantity: int = Field(..., ge=0)

class ItemInDB(ItemBase):
    id: str

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "item_987654321",
                "name": "Bratwurst Sausages Pack",
                "price": 12.50,
                "quantity": 50,
                "image_url": "https://example.com/images/bratwurst.png",
                "expiry_date": "2024-12-31",
                "supplier_id": "supp_12345"
            }
        }
    )

class LowStockReport(BaseModel):
    items: List[ItemInDB]
    count: int

class AnalyticsReport(BaseModel):
    total_items: int
    total_value: float
    supplier_count: int


class SupplierOut(BaseModel):
    id: str
    name: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    supplier_id: Optional[str] = None
