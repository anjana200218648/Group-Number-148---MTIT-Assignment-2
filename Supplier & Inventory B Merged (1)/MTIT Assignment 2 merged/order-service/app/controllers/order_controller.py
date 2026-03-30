from fastapi import HTTPException, status as http_status
from typing import Optional

from app.services.order_service import (
    create_order,
    get_all_orders,
    get_order_by_id,
    update_order,
    update_order_status,
    delete_order,
)
from app.models.order_model import OrderCreate, OrderUpdate, StatusUpdate


async def handle_create_order(order_data: OrderCreate) -> dict:
    """Controller: Create a new order."""
    order = await create_order(order_data)
    return {"success": True, "message": "Order created successfully", "data": order}


async def handle_get_all_orders(
    restaurant_id: Optional[str],
    supplier_id: Optional[str],
    status: Optional[str],
) -> dict:
    """Controller: Retrieve orders with optional filters."""
    orders = await get_all_orders(restaurant_id, supplier_id, status)
    return {
        "success": True,
        "message": f"Retrieved {len(orders)} order(s)",
        "data": {"total": len(orders), "orders": orders},
    }


async def handle_get_order(order_id: str) -> dict:
    """Controller: Get a single order by ID."""
    order = await get_order_by_id(order_id)
    return {"success": True, "message": "Order retrieved successfully", "data": order}


async def handle_update_order(order_id: str, update_data: OrderUpdate) -> dict:
    """Controller: Update order details."""
    order = await update_order(order_id, update_data)
    return {"success": True, "message": "Order updated successfully", "data": order}


async def handle_update_status(order_id: str, status_update: StatusUpdate) -> dict:
    """Controller: Transition order status."""
    order = await update_order_status(order_id, status_update.new_status, status_update.note)
    return {
        "success": True,
        "message": f"Order status updated to '{status_update.new_status.value}'",
        "data": order,
    }


async def handle_delete_order(order_id: str) -> dict:
    """Controller: Delete a pending order."""
    result = await delete_order(order_id)
    return {"success": True, "message": f"Order '{order_id}' deleted successfully", "data": result}
