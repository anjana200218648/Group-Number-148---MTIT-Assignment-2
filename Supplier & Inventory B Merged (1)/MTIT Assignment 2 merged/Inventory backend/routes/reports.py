from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from core.auth import get_current_user, require_super_admin
from core.firebase import get_db

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/", response_model=Dict[str, Any])
async def get_dashboard_reports(user: dict = Depends(require_super_admin)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not available.")

    # Real logic: calculate all aggregations
    items_ref = db.collection("items").stream()
    total_items = 0
    total_value = 0.0
    suppliers = set()

    for item in items_ref:
        data = item.to_dict()
        qty = data.get("quantity", 0)
        price = data.get("price", 0.0)
        total_items += qty
        total_value += (qty * price)
        if "supplier_id" in data:
            suppliers.add(data["supplier_id"])

    return {
        "total_items": total_items,
        "total_value": total_value,
        "supplier_count": len(suppliers)
    }

@router.get("/low-stock", response_model=Dict[str, Any])
async def get_low_stock(threshold: int = 10, user: dict = Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not available.")

    low_stock = []
        
    items_ref = db.collection("items").where("quantity", "<", threshold).stream()
    for item in items_ref:
         low_stock.append(item.to_dict())
         
    return {
         "items": low_stock,
         "count": len(low_stock)
    }
