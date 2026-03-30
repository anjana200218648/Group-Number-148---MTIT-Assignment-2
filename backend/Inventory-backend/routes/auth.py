from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from jose import jwt

from core.settings import JWT_ALGORITHM, JWT_SECRET_KEY

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginData(BaseModel):
    role: str
    supplier_id: str | None = Field(default=None, description="Optional, only for Supplier")

@router.post("/login")
async def login(data: LoginData):
    # This acts as a simulator for real authentication but generates a REAL signed JWT
    if data.role not in ["User", "Supplier", "Admin", "Super Admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    uid = f"user_{data.role.lower().replace(' ', '')}"
    if data.role == "Supplier":
        uid = f"supplier_{data.supplier_id if data.supplier_id else 'default'}"
        
    payload = {
        "uid": uid,
        "role": data.role,
        "supplier_id": data.supplier_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": data.role,
        "supplier_id": data.supplier_id
    }
