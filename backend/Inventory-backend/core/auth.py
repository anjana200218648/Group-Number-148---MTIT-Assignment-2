from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import logging

from .settings import JWT_ALGORITHM, JWT_SECRET_KEY

logger = logging.getLogger(__name__)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Decode the REAL JWT instead of checking for hardcoded mocked strings
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        role = payload.get("role")
        if role is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {"uid": payload.get("uid"), "role": role, "supplier_id": payload.get("supplier_id")}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_super_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "Super Admin":
        raise HTTPException(status_code=403, detail="Super Admin privileges required")
    return user

def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") not in ["Super Admin", "Admin"]:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user
