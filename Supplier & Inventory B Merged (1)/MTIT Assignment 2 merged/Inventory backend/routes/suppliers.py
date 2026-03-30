from fastapi import APIRouter, HTTPException
from typing import List

from core.firebase import get_db
from models.schemas import SupplierOut

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("/", response_model=List[SupplierOut])
async def get_suppliers():
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not available.")

    docs = db.collection("items").stream()
    suppliers = set()
    for doc in docs:
        data = doc.to_dict()
        sid = data.get("supplier_id")
        if sid:
            suppliers.add(sid)
            
    return [{"id": sid, "name": f"Supplier: {sid}"} for sid in suppliers]
