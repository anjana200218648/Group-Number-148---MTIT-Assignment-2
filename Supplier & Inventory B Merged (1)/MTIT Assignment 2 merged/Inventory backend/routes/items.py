from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from typing import List, Optional

from models.schemas import ItemStockUpdate, ItemInDB, ItemCreate
from core.auth import get_current_user
from core.firebase import get_db, get_bucket
import uuid
import datetime
from datetime import timedelta
import logging
from urllib.parse import quote

router = APIRouter(prefix="/items", tags=["Items"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=ItemInDB)
async def create_item(
    name: str = Form(...),
    price: float = Form(...),
    quantity: int = Form(...),
    supplier_id: str = Form(...),
    expiry_date: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user)
):
    # FastAPI-safe validation for form fields.
    if price <= 0:
        raise HTTPException(status_code=422, detail="price must be > 0")
    if quantity < 0:
        raise HTTPException(status_code=422, detail="quantity must be >= 0")
    if not supplier_id or not supplier_id.strip():
        raise HTTPException(status_code=422, detail="supplier_id is required")

    # Determine capabilities
    if user.get("role") == "Supplier":
        # Supplier cannot spoof supplier_id
        if user.get("supplier_id") and user.get("supplier_id") != supplier_id:
           raise HTTPException(status_code=403, detail="You can only add stock for your own supplier id.")

    image_url = None
    if image:
        bucket = get_bucket()
        if not bucket:
            raise HTTPException(status_code=500, detail="Firebase Storage is not available.")

        try:
            # Upload to Firebase Storage and generate a stable Firebase download URL.
            # This avoids dependence on public bucket ACL settings.
            object_path = f"items/{uuid.uuid4()}_{image.filename}"
            blob = bucket.blob(object_path)
            download_token = uuid.uuid4().hex
            blob.metadata = {"firebaseStorageDownloadTokens": download_token}
            blob.upload_from_file(image.file, content_type=image.content_type)
            image_url = (
                f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/"
                f"{quote(object_path, safe='')}?alt=media&token={download_token}"
            )
        except Exception as e:
            # Keep product creation available even if bucket setup is incomplete.
            logger.warning(
                "Image upload failed (%s). Saving item without image_url. "
                "Verify FIREBASE_STORAGE_BUCKET and Storage setup.",
                e,
            )
            image_url = None

    item_id = str(uuid.uuid4())
    item_data = {
        "id": item_id,
        "name": name,
        "price": price,
        "quantity": quantity,
        "supplier_id": supplier_id,
        "expiry_date": expiry_date,
        "image_url": image_url,
        "created_at": datetime.datetime.now(datetime.UTC).isoformat()
    }

    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not available.")

    db.collection("items").document(item_id).set(item_data)
    return ItemInDB(**item_data)


@router.post("/json", response_model=ItemInDB)
async def create_item_json(
    payload: ItemCreate,
    user: dict = Depends(get_current_user),
):
    """
    JSON-only variant of the create endpoint (no image upload).
    This allows clients to use JSON when multipart is not needed.
    """
    if user.get("role") == "Supplier":
        if user.get("supplier_id") and user.get("supplier_id") != payload.supplier_id:
            raise HTTPException(
                status_code=403,
                detail="You can only add stock for your own supplier id.",
            )

    item_id = str(uuid.uuid4())
    item_data = payload.model_dump()
    item_data["id"] = item_id
    item_data["created_at"] = datetime.datetime.now(datetime.UTC).isoformat()

    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not available.")

    db.collection("items").document(item_id).set(item_data)
    return ItemInDB(**item_data)


@router.get("/", response_model=List[ItemInDB])
async def get_items(supplier_id: Optional[str] = None):
    db = get_db()
    items = []
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not available.")

    docs = db.collection("items")
    if supplier_id:
        docs = docs.where("supplier_id", "==", supplier_id)
    for doc in docs.stream():
        items.append(ItemInDB(**doc.to_dict()))
    return items

@router.get("/{item_id}", response_model=ItemInDB)
async def get_item_by_id(item_id: str):
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not available.")

    doc_ref = db.collection("items").document(item_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return ItemInDB(**doc.to_dict())

@router.delete("/{item_id}")
async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not available.")

    # Requirement: only Super Admin or specific roles might delete, but we'll restrict to Super Admin for safety
    if user.get("role") != "Super Admin":
        raise HTTPException(status_code=403, detail="Only Super Admins can delete items.")

    doc_ref = db.collection("items").document(item_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Item not found")

    doc_ref.delete()
    return {"detail": "Item deleted successfully"}

@router.put("/{item_id}", response_model=ItemInDB)
async def update_item(item_id: str, item_update: ItemStockUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    target_item = None

    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not available.")

    doc_ref = db.collection("items").document(item_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Item not found")
    target_item = doc.to_dict()

    # Requirement: only Super Admin can update price + quantity.
    if user.get("role") != "Super Admin":
        raise HTTPException(status_code=403, detail="Only Super Admins can update stock quantity and price.")

    update_data = item_update.model_dump()

    # Apply updates
    doc_ref.update(update_data)
    return ItemInDB(**{**target_item, **update_data})
