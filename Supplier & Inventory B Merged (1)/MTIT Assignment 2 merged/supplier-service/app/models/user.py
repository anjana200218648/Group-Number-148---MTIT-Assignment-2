from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    SUPPLIER_MANAGER = "supplier_manager"
    VIEWER = "viewer"

class User(BaseModel):
    uid: str
    email: EmailStr
    name: str
    role: UserRole
    permissions: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    
class TokenData(BaseModel):
    uid: str
    email: str
    role: UserRole