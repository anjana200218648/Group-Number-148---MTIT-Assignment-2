from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth_service import AuthService
from app.models.user import TokenData
from typing import Optional

security = HTTPBearer()

class AuthMiddleware:
    @staticmethod
    async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
        """Verify JWT token and return user data"""
        token = credentials.credentials
        return await AuthService.verify_token(token)
    
    @staticmethod
    async def check_permission(token_data: TokenData, required_permission: str):
        """Check if user has required permission"""
        if not AuthService.check_permission(token_data, required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return token_data