from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.services.auth_service import AuthService
from app.middleware.auth_middleware import AuthMiddleware
from app.models.user import UserRole, TokenData

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserCreateRequest(BaseModel):
    email: str
    password: str
    name: str
    role: UserRole = UserRole.VIEWER

class TokenResponse(BaseModel):
    token: str
    user: dict

@router.post("/register", response_model=dict)
async def register_user(request: UserCreateRequest):
    """Register a new user (Admin only)"""
    # In production, you'd check admin permissions here
    user = await AuthService.create_user(
        email=request.email,
        password=request.password,
        name=request.name,
        role=request.role
    )
    return {"message": "User created successfully", "user": user}

@router.post("/verify", response_model=TokenData)
async def verify_token(token_data: TokenData = Depends(AuthMiddleware.verify_token)):
    """Verify token and return user data"""
    return token_data