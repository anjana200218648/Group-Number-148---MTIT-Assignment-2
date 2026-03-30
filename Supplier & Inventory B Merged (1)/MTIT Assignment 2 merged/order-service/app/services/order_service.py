from fastapi import HTTPException, status as http_status
from firebase_admin import firestore
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.database.firebase_config import get_db
from app.models.order_model import (
    OrderCreate,
    OrderUpdate,
    OrderStatus,
    OrderItem,
    StatusHistoryEntry,
    VALID_TRANSITIONS,
)
from app.utils.logger import log_order_action, log_error


ORDERS_COLLECTION = "orders"


def _calculate_total(items: list[OrderItem]) -> float:
    """Calculate the total price from order items."""
    return round(sum(item.quantity * item.price for item in items), 2)


def _serialize_order(doc_data: dict) -> dict:
    """Normalize Firestore document data to a consistent dict format."""
    # Convert Firestore DatetimeWithNanoseconds to ISO string if necessary
    for field in ("created_at", "updated_at"):
        val = doc_data.get(field)
        if hasattr(val, "isoformat"):
            doc_data[field] = val.isoformat()
    return doc_data


# ─────────────────────────────────────────────
# CREATE
# ─────────────────────────────────────────────
async def create_order(order_data: OrderCreate) -> dict:
    """Create a new order in Firestore."""
    try:
        db = get_db()
        order_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        total_price = _calculate_total(order_data.items)

        initial_history = StatusHistoryEntry(
            from_status=None,
            to_status=OrderStatus.PENDING.value,
            changed_at=now,
            note="Order created",
        )

        order_doc = {
            "order_id": order_id,
            "restaurant_id": order_data.restaurant_id,
            "supplier_id": order_data.supplier_id,
            "items": [item.model_dump() for item in order_data.items],
            "total_price": total_price,
            "status": OrderStatus.PENDING.value,
            "status_history": [initial_history.model_dump()],
            "created_at": now,
            "updated_at": now,
        }

        db.collection(ORDERS_COLLECTION).document(order_id).set(order_doc)
        log_order_action("CREATE", order_id, {"restaurant_id": order_data.restaurant_id, "total": total_price})
        return order_doc

    except Exception as e:
        log_error("create_order", e)
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create order: {str(e)}")


# ─────────────────────────────────────────────
# READ ALL
# ─────────────────────────────────────────────
async def get_all_orders(
    restaurant_id: Optional[str] = None,
    supplier_id: Optional[str] = None,
    status: Optional[str] = None,
) -> list[dict]:
    """Fetch orders, with optional filters."""
    try:
        db = get_db()
        query = db.collection(ORDERS_COLLECTION)

        if restaurant_id:
            query = query.where("restaurant_id", "==", restaurant_id)
        if supplier_id:
            query = query.where("supplier_id", "==", supplier_id)
        if status:
            query = query.where("status", "==", status)

        docs = query.stream()
        orders = [_serialize_order(doc.to_dict()) for doc in docs]
        return orders

    except Exception as e:
        log_error("get_all_orders", e)
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve orders: {str(e)}")


# ─────────────────────────────────────────────
# READ ONE
# ─────────────────────────────────────────────
async def get_order_by_id(order_id: str) -> dict:
    """Fetch a single order by order_id."""
    try:
        db = get_db()
        doc = db.collection(ORDERS_COLLECTION).document(order_id).get()

        if not doc.exists:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=f"Order '{order_id}' not found")

        return _serialize_order(doc.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        log_error("get_order_by_id", e, order_id)
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve order: {str(e)}")


# ─────────────────────────────────────────────
# UPDATE (items / metadata)
# ─────────────────────────────────────────────
async def update_order(order_id: str, update_data: OrderUpdate) -> dict:
    """Update an order's items or metadata. Items can only be changed when status = Pending."""
    try:
        db = get_db()
        doc_ref = db.collection(ORDERS_COLLECTION).document(order_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=f"Order '{order_id}' not found")

        current = doc.to_dict()

        if update_data.items is not None:
            if current["status"] != OrderStatus.PENDING.value:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail="Items can only be modified when order status is 'Pending'",
                )

        now = datetime.now(timezone.utc).isoformat()
        patch: dict = {"updated_at": now}

        if update_data.items is not None:
            patch["items"] = [item.model_dump() for item in update_data.items]
            patch["total_price"] = _calculate_total(update_data.items)
        if update_data.restaurant_id is not None:
            patch["restaurant_id"] = update_data.restaurant_id
        if update_data.supplier_id is not None:
            patch["supplier_id"] = update_data.supplier_id

        doc_ref.update(patch)
        log_order_action("UPDATE", order_id, {"fields": list(patch.keys())})

        updated_doc = doc_ref.get()
        return _serialize_order(updated_doc.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        log_error("update_order", e, order_id)
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update order: {str(e)}")


# ─────────────────────────────────────────────
# STATUS TRANSITION
# ─────────────────────────────────────────────
async def update_order_status(order_id: str, new_status: OrderStatus, note: Optional[str] = None) -> dict:
    """Apply a validated status transition and record history."""
    try:
        db = get_db()
        doc_ref = db.collection(ORDERS_COLLECTION).document(order_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=f"Order '{order_id}' not found")

        current = doc.to_dict()
        current_status = OrderStatus(current["status"])

        allowed_transitions = VALID_TRANSITIONS.get(current_status, [])
        if new_status not in allowed_transitions:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from '{current_status.value}' to '{new_status.value}'. "
                       f"Allowed: {[s.value for s in allowed_transitions] if allowed_transitions else 'No further transitions allowed'}",
            )

        now = datetime.now(timezone.utc).isoformat()
        history_entry = StatusHistoryEntry(
            from_status=current_status.value,
            to_status=new_status.value,
            changed_at=now,
            note=note,
        )

        doc_ref.update({
            "status": new_status.value,
            "updated_at": now,
            "status_history": firestore.ArrayUnion([history_entry.model_dump()]),
        })

        log_order_action("STATUS_UPDATE", order_id, {"from": current_status.value, "to": new_status.value})

        updated_doc = doc_ref.get()
        return _serialize_order(updated_doc.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        log_error("update_order_status", e, order_id)
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update order status: {str(e)}")


# ─────────────────────────────────────────────
# DELETE
# ─────────────────────────────────────────────
async def delete_order(order_id: str) -> dict:
    """Delete an order — only allowed when status = Pending."""
    try:
        db = get_db()
        doc_ref = db.collection(ORDERS_COLLECTION).document(order_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=f"Order '{order_id}' not found")

        current = doc.to_dict()
        if current["status"] != OrderStatus.PENDING.value:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Order can only be deleted when status is 'Pending'. Current: '{current['status']}'",
            )

        doc_ref.delete()
        log_order_action("DELETE", order_id, {"status_at_delete": current["status"]})
        return {"order_id": order_id, "deleted": True}

    except HTTPException:
        raise
    except Exception as e:
        log_error("delete_order", e, order_id)
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete order: {str(e)}")
