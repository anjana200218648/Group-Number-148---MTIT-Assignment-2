from fastapi import APIRouter, Query, Path
from fastapi.responses import JSONResponse
from typing import Optional

from app.controllers.order_controller import (
    handle_create_order,
    handle_get_all_orders,
    handle_get_order,
    handle_update_order,
    handle_update_status,
    handle_delete_order,
)
from app.models.order_model import OrderCreate, OrderUpdate, StatusUpdate

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post(
    "/",
    summary="Create a new order",
    description="Creates a new order for a restaurant to a supplier. Total price is auto-calculated from items.",
    status_code=201,
    responses={
        201: {"description": "Order created successfully"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"},
    },
)
async def create_order(order_data: OrderCreate):
    result = await handle_create_order(order_data)
    return JSONResponse(status_code=201, content=result)


@router.get(
    "/",
    summary="Get all orders",
    description="Retrieve all orders. Optionally filter by restaurant_id, supplier_id, or status.",
)
async def get_orders(
    restaurant_id: Optional[str] = Query(None, description="Filter by restaurant ID"),
    supplier_id: Optional[str] = Query(None, description="Filter by supplier ID"),
    status: Optional[str] = Query(None, description="Filter by status (Pending, Approved, Dispatched, Delivered, Cancelled)"),
):
    return await handle_get_all_orders(restaurant_id, supplier_id, status)


@router.get(
    "/{order_id}",
    summary="Get a single order",
    description="Retrieve full details of a specific order by its ID.",
)
async def get_order(
    order_id: str = Path(..., description="Unique order ID"),
):
    return await handle_get_order(order_id)


@router.put(
    "/{order_id}",
    summary="Update order details",
    description="Update restaurant_id, supplier_id, or items. Items can only be modified when status = Pending.",
)
async def update_order(
    order_id: str = Path(..., description="Unique order ID"),
    update_data: OrderUpdate = ...,
):
    return await handle_update_order(order_id, update_data)


@router.patch(
    "/{order_id}/status",
    summary="Update order status",
    description="""
    Transition the order status following the valid workflow:
    - **Pending** → Approved, Cancelled
    - **Approved** → Dispatched, Cancelled
    - **Dispatched** → Delivered, Cancelled
    - **Delivered** → (terminal)
    - **Cancelled** → (terminal)
    """,
)
async def update_status(
    order_id: str = Path(..., description="Unique order ID"),
    status_update: StatusUpdate = ...,
):
    return await handle_update_status(order_id, status_update)


@router.delete(
    "/{order_id}",
    summary="Delete an order",
    description="Permanently delete an order. Only allowed when status = Pending.",
)
async def delete_order(
    order_id: str = Path(..., description="Unique order ID"),
):
    return await handle_delete_order(order_id)
