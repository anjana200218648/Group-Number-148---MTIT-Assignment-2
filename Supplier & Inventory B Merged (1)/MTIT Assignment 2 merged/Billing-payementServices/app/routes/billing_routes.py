"""
Billing Routes - REST API endpoints for billing & payment operations.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.billing_model import (
    BillResponse,
    CreateBillRequest,
    MonthlyReportResponse,
    PaymentResponse,
    ProcessPaymentRequest,
    SupplierBillingSummary,
)
from app.services import billing_service

router = APIRouter()


# ─────────────────────────────────────────────
# POST /billing/create — Create a new bill
# ─────────────────────────────────────────────
@router.post("/create", response_model=BillResponse, status_code=201)
async def create_bill(request: CreateBillRequest):
    """
    Create a new bill/invoice for an order.
    
    - Calculates total based on items
    - Applies 10% bulk discount automatically if total quantity > 50
    - Generates unique invoice number
    """
    return await billing_service.create_bill(request)


# ─────────────────────────────────────────────
# GET /billing — Get all bills
# ─────────────────────────────────────────────
@router.get("/", response_model=list[BillResponse])
async def get_all_bills():
    """Retrieve all bills/invoices."""
    return await billing_service.get_all_bills()


# ─────────────────────────────────────────────
# GET /billing/report/monthly — Monthly report
# ─────────────────────────────────────────────
@router.get("/report/monthly", response_model=MonthlyReportResponse)
async def get_monthly_report(
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12). Defaults to current month."),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Year. Defaults to current year."),
):
    """
    Generate a monthly financial report.
    
    Returns total revenue, paid/pending amounts, and top suppliers by revenue.
    """
    return await billing_service.get_monthly_report(month=month, year=year)


# ─────────────────────────────────────────────
# GET /billing/{bill_id} — Get bill by ID
# ─────────────────────────────────────────────
@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill_by_id(bill_id: str):
    """Retrieve a specific bill by its ID."""
    return await billing_service.get_bill_by_id(bill_id)


# ─────────────────────────────────────────────
# DELETE /billing/{bill_id} — Delete bill by ID
# ─────────────────────────────────────────────
@router.delete("/{bill_id}", status_code=200)
async def delete_bill_route(bill_id: str):
    """Delete a specific bill by its ID."""
    return await billing_service.delete_bill(bill_id)


# ─────────────────────────────────────────────
# POST /billing/pay — Process a payment
# ─────────────────────────────────────────────
@router.post("/pay", response_model=PaymentResponse, status_code=201)
async def process_payment(request: ProcessPaymentRequest):
    """
    Process a payment for a bill.
    
    - Validates that the bill exists and is not already paid
    - Validates that paid_amount >= final_amount
    - Creates a payment record and updates bill status to 'paid'
    """
    return await billing_service.process_payment(request)


# ─────────────────────────────────────────────
# GET /billing/supplier/{supplier_id} — Supplier billing summary
# ─────────────────────────────────────────────
@router.get("/supplier/{supplier_id}", response_model=SupplierBillingSummary)
async def get_supplier_bills(supplier_id: str):
    """Get all bills and billing summary for a specific supplier."""
    return await billing_service.get_supplier_bills(supplier_id)


# ─────────────────────────────────────────────
# GET /billing/payments/all — Get all payments
# ─────────────────────────────────────────────
@router.get("/payments/all", response_model=list[PaymentResponse])
async def get_all_payments():
    """Retrieve all payment records."""
    return await billing_service.get_all_payments()
