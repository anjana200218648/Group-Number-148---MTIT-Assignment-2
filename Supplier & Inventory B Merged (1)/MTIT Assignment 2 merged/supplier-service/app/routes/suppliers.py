from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from app.services.supplier_service import SupplierService
from app.models.supplier import Supplier, CreateSupplierRequest, UpdateSupplierRequest, SupplierStatus
from app.middleware.auth_middleware import AuthMiddleware
from app.models.user import TokenData

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.post("/", response_model=Supplier, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    request: CreateSupplierRequest,
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """Create a new supplier (Admin, Supplier Manager only)"""
    await AuthMiddleware.check_permission(token_data, "supplier:create")
    
    supplier = await SupplierService.create_supplier(request, token_data.uid)
    return supplier

@router.get("/", response_model=List[Supplier])
async def get_suppliers(
    status: Optional[SupplierStatus] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """Get all suppliers with filters"""
    await AuthMiddleware.check_permission(token_data, "supplier:read")
    
    suppliers = await SupplierService.get_all_suppliers(status, category, limit)
    return suppliers

@router.get("/{supplier_id}", response_model=Supplier)
async def get_supplier(
    supplier_id: str,
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """Get supplier by ID"""
    await AuthMiddleware.check_permission(token_data, "supplier:read")
    
    supplier = await SupplierService.get_supplier(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.put("/{supplier_id}", response_model=Supplier)
async def update_supplier(
    supplier_id: str,
    request: UpdateSupplierRequest,
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """Update supplier information (Admin, Supplier Manager only)"""
    await AuthMiddleware.check_permission(token_data, "supplier:update")
    
    supplier = await SupplierService.update_supplier(supplier_id, request)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: str,
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """Soft delete supplier (Admin only)"""
    await AuthMiddleware.check_permission(token_data, "supplier:delete")
    
    deleted = await SupplierService.delete_supplier(supplier_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Supplier not found")