from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional, List
from enum import Enum

class SupplierStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"

class ContactInfo(BaseModel):
    phone: str
    email: EmailStr
    address: str
    city: str
    country: str
    postal_code: str

class BankInfo(BaseModel):
    bank_name: str
    account_number: str
    account_name: str
    
class Supplier(BaseModel):
    id: Optional[str] = None
    supplier_code: str
    company_name: str
    contact_person: str
    contact_info: ContactInfo
    bank_info: Optional[BankInfo] = None
    status: SupplierStatus = SupplierStatus.PENDING
    rating: float = 0.0
    total_orders: int = 0
    on_time_delivery_rate: float = 0.0
    quality_score: float = 0.0
    categories: List[str] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[str] = None
    
    @validator('rating')
    def validate_rating(cls, v):
        if v < 0 or v > 5:
            raise ValueError('Rating must be between 0 and 5')
        return v
    
    @validator('on_time_delivery_rate', 'quality_score')
    def validate_percentage(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Value must be between 0 and 100')
        return v

class CreateSupplierRequest(BaseModel):
    company_name: str
    contact_person: str
    contact_info: ContactInfo
    bank_info: Optional[BankInfo] = None
    categories: List[str] = []

class UpdateSupplierRequest(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_info: Optional[ContactInfo] = None
    bank_info: Optional[BankInfo] = None
    status: Optional[SupplierStatus] = None
    categories: Optional[List[str]] = None