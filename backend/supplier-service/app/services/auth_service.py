from app.config.firebase_config import firebase_auth, db
from app.models.user import User, UserRole, TokenData
from fastapi import HTTPException, status
import firebase_admin.auth as auth
from typing import Optional
from datetime import datetime

class AuthService:
    @staticmethod
    async def verify_token(token: str) -> TokenData:
        """Verify Firebase ID token"""
        try:
            decoded_token = firebase_auth.verify_id_token(token)
            uid = decoded_token['uid']
            email = decoded_token.get('email')
            
            # Get user role from Firestore
            user_doc = db.collection('users').document(uid).get()
            
            if user_doc.exists:
                user_data = user_doc.to_dict()
                role = UserRole(user_data.get('role', 'viewer'))
            else:
                # Default role for new users
                role = UserRole.VIEWER
            
            return TokenData(
                uid=uid,
                email=email,
                role=role
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
    
    @staticmethod
    async def create_user(email: str, password: str, name: str, role: UserRole = UserRole.VIEWER):
        """Create new user with role"""
        try:
            # Create user in Firebase Auth
            user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=name
            )
            
            # Store user role in Firestore
            user_data = {
                'uid': user.uid,
                'email': email,
                'name': name,
                'role': role.value,
                'permissions': AuthService._get_role_permissions(role),
                'is_active': True,
                'created_at': datetime.now()
            }
            
            db.collection('users').document(user.uid).set(user_data)
            
            return user_data
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    @staticmethod
    def _get_role_permissions(role: UserRole) -> list:
        """Get permissions based on role"""
        permissions = {
            UserRole.ADMIN: [
                'supplier:create', 'supplier:read', 'supplier:update', 'supplier:delete',
                'supplier:approve', 'performance:view', 'performance:update',
                'user:create', 'user:read', 'user:update', 'user:delete'
            ],
            UserRole.SUPPLIER_MANAGER: [
                'supplier:create', 'supplier:read', 'supplier:update',
                'supplier:approve', 'performance:view', 'performance:update'
            ],
            UserRole.VIEWER: [
                'supplier:read', 'performance:view'
            ]
        }
        return permissions.get(role, [])
    
    @staticmethod
    def check_permission(token_data: TokenData, required_permission: str) -> bool:
        """Check if user has specific permission"""
        user_doc = db.collection('users').document(token_data.uid).get()
        if user_doc.exists:
            permissions = user_doc.to_dict().get('permissions', [])
            return required_permission in permissions
        return False