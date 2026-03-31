"""
Billing Service - Core business logic for billing & payment operations.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException

from app.firebase.firebase_config import get_firestore_client
from app.models.billing_model import (
    BillItem,
    BillResponse,
    CreateBillRequest,
    MonthlyReportResponse,
    PaymentMethod,
    PaymentResponse,
    PaymentStatus,
    ProcessPaymentRequest,
    SupplierBillingSummary,
)
from app.utils.invoice_generator import generate_invoice_number


DISCOUNT_THRESHOLD_QUANTITY = 50
BULK_DISCOUNT_RATE = 0.10  # 10%


def _compute_bill_totals(items: List[BillItem]):
    """Compute subtotal, discount, and final amount."""
    subtotal = sum(item.quantity * item.unit_price for item in items)
    total_quantity = sum(item.quantity for item in items)

    discount_pct = BULK_DISCOUNT_RATE if total_quantity > DISCOUNT_THRESHOLD_QUANTITY else 0.0
    discount_amount = round(subtotal * discount_pct, 2)
    final_amount = round(subtotal - discount_amount, 2)

    return round(subtotal, 2), discount_pct, discount_amount, final_amount


def _doc_to_bill(doc) -> BillResponse:
    """Convert Firestore document to BillResponse."""
    data = doc.to_dict()
    raw_items = data.get("items", [])
    items = [BillItem(**item) if isinstance(item, dict) else item for item in raw_items]

    return BillResponse(
        bill_id=data.get("bill_id", doc.id),
        invoice_number=data.get("invoice_number", ""),
        order_id=data.get("order_id", ""),
        supplier_id=data.get("supplier_id", ""),
        supplier_name=data.get("supplier_name"),
        items=items,
        subtotal=data.get("subtotal", 0.0),
        discount_percentage=data.get("discount_percentage", 0.0),
        discount_amount=data.get("discount_amount", 0.0),
        final_amount=data.get("final_amount", 0.0),
        status=PaymentStatus(data.get("status", "pending")),
        notes=data.get("notes"),
        created_at=data.get("created_at", ""),
        updated_at=data.get("updated_at"),
    )


def _doc_to_payment(doc) -> PaymentResponse:
    """Convert Firestore document to PaymentResponse."""
    data = doc.to_dict()
    return PaymentResponse(
        payment_id=data.get("payment_id", doc.id),
        bill_id=data.get("bill_id", ""),
        invoice_number=data.get("invoice_number"),
        supplier_id=data.get("supplier_id"),
        supplier_name=data.get("supplier_name"),
        payment_method=PaymentMethod(data.get("payment_method", "cash")),
        paid_amount=data.get("paid_amount", 0.0),
        transaction_reference=data.get("transaction_reference"),
        notes=data.get("notes"),
        payment_date=data.get("payment_date", ""),
    )


# ─────────────────────────────────────────────
# CREATE BILL
# ─────────────────────────────────────────────

async def create_bill(request: CreateBillRequest) -> BillResponse:
    db = get_firestore_client()

    subtotal, discount_pct, discount_amount, final_amount = _compute_bill_totals(request.items)

    bill_id = f"BILL-{uuid.uuid4().hex[:8].upper()}"
    invoice_number = generate_invoice_number()
    now = datetime.utcnow().isoformat()

    items_data = [
        {
            "item_name": item.item_name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total": round(item.quantity * item.unit_price, 2),
        }
        for item in request.items
    ]

    bill_data = {
        "bill_id": bill_id,
        "invoice_number": invoice_number,
        "order_id": request.order_id,
        "supplier_id": request.supplier_id,
        "supplier_name": request.supplier_name or request.supplier_id,
        "items": items_data,
        "subtotal": subtotal,
        "discount_percentage": discount_pct,
        "discount_amount": discount_amount,
        "final_amount": final_amount,
        "status": PaymentStatus.PENDING.value,
        "notes": request.notes,
        "created_at": now,
        "updated_at": now,
    }

    db.collection("bills").document(bill_id).set(bill_data)

    return BillResponse(
        bill_id=bill_id,
        invoice_number=invoice_number,
        order_id=request.order_id,
        supplier_id=request.supplier_id,
        supplier_name=request.supplier_name or request.supplier_id,
        items=[BillItem(**item) for item in items_data],
        subtotal=subtotal,
        discount_percentage=discount_pct,
        discount_amount=discount_amount,
        final_amount=final_amount,
        status=PaymentStatus.PENDING,
        notes=request.notes,
        created_at=now,
        updated_at=now,
    )


# ─────────────────────────────────────────────
# GET ALL BILLS
# ─────────────────────────────────────────────

async def get_all_bills() -> List[BillResponse]:
    db = get_firestore_client()
    docs = db.collection("bills").stream()
    return [_doc_to_bill(doc) for doc in docs]


# ─────────────────────────────────────────────
# GET BILL BY ID
# ─────────────────────────────────────────────

async def get_bill_by_id(bill_id: str) -> BillResponse:
    db = get_firestore_client()
    doc = db.collection("bills").document(bill_id).get()

    if not doc.exists or doc.to_dict() is None:
        raise HTTPException(status_code=404, detail=f"Bill '{bill_id}' not found.")

    return _doc_to_bill(doc)


# ─────────────────────────────────────────────
# DELETE BILL
# ─────────────────────────────────────────────

async def delete_bill(bill_id: str) -> dict:
    db = get_firestore_client()
    doc = db.collection("bills").document(bill_id).get()

    if not doc.exists or doc.to_dict() is None:
        raise HTTPException(status_code=404, detail=f"Bill '{bill_id}' not found.")

    db.collection("bills").document(bill_id).delete()
    return {"message": f"Bill '{bill_id}' deleted successfully."}


# ─────────────────────────────────────────────
# PROCESS PAYMENT
# ─────────────────────────────────────────────

async def process_payment(request: ProcessPaymentRequest) -> PaymentResponse:
    db = get_firestore_client()

    bill_doc = db.collection("bills").document(request.bill_id).get()
    if not bill_doc.exists or bill_doc.to_dict() is None:
        raise HTTPException(status_code=404, detail=f"Bill '{request.bill_id}' not found.")

    bill_data = bill_doc.to_dict()

    if bill_data.get("status") == PaymentStatus.PAID.value:
        raise HTTPException(status_code=400, detail="Bill is already paid.")

    if request.paid_amount < bill_data.get("final_amount", 0):
        raise HTTPException(
            status_code=400,
            detail=f"Paid amount {request.paid_amount} is less than final amount {bill_data.get('final_amount')}.",
        )

    payment_id = f"PAY-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.utcnow().isoformat()

    payment_data = {
        "payment_id": payment_id,
        "bill_id": request.bill_id,
        "invoice_number": bill_data.get("invoice_number"),
        "supplier_id": bill_data.get("supplier_id"),
        "supplier_name": bill_data.get("supplier_name"),
        "payment_method": request.payment_method.value,
        "paid_amount": request.paid_amount,
        "transaction_reference": request.transaction_reference,
        "notes": request.notes,
        "payment_date": now,
    }

    db.collection("payments").document(payment_id).set(payment_data)

    # Update bill status
    db.collection("bills").document(request.bill_id).update(
        {"status": PaymentStatus.PAID.value, "updated_at": now}
    )

    return PaymentResponse(**payment_data)


# ─────────────────────────────────────────────
# SUPPLIER-WISE BILLING
# ─────────────────────────────────────────────

async def get_supplier_bills(supplier_id: str) -> SupplierBillingSummary:
    db = get_firestore_client()
    docs = db.collection("bills").where("supplier_id", "==", supplier_id).stream()
    bills = [_doc_to_bill(doc) for doc in docs]

    if not bills:
        raise HTTPException(status_code=404, detail=f"No bills found for supplier '{supplier_id}'.")

    total_amount = sum(b.final_amount for b in bills)
    paid_amount = sum(b.final_amount for b in bills if b.status == PaymentStatus.PAID)
    pending_amount = total_amount - paid_amount

    supplier_name = bills[0].supplier_name if bills else supplier_id

    return SupplierBillingSummary(
        supplier_id=supplier_id,
        supplier_name=supplier_name,
        total_bills=len(bills),
        total_amount=round(total_amount, 2),
        paid_amount=round(paid_amount, 2),
        pending_amount=round(pending_amount, 2),
        bills=bills,
    )


# ─────────────────────────────────────────────
# MONTHLY FINANCIAL REPORT
# ─────────────────────────────────────────────

async def get_monthly_report(month: Optional[int] = None, year: Optional[int] = None) -> MonthlyReportResponse:
    db = get_firestore_client()

    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year

    all_docs = db.collection("bills").stream()
    all_bills = [_doc_to_bill(doc) for doc in all_docs]

    # Filter by month/year
    monthly_bills = []
    for bill in all_bills:
        try:
            created = datetime.fromisoformat(bill.created_at)
            if created.month == target_month and created.year == target_year:
                monthly_bills.append(bill)
        except Exception:
            pass

    total_revenue = sum(b.final_amount for b in monthly_bills)
    total_paid = sum(b.final_amount for b in monthly_bills if b.status == PaymentStatus.PAID)
    total_pending = total_revenue - total_paid
    paid_count = sum(1 for b in monthly_bills if b.status == PaymentStatus.PAID)
    pending_count = len(monthly_bills) - paid_count

    # Top suppliers by revenue
    supplier_revenue: dict = {}
    for bill in monthly_bills:
        sid = bill.supplier_id
        if sid not in supplier_revenue:
            supplier_revenue[sid] = {
                "supplier_id": sid,
                "supplier_name": bill.supplier_name or sid,
                "total_revenue": 0.0,
                "bill_count": 0,
            }
        supplier_revenue[sid]["total_revenue"] = round(
            supplier_revenue[sid]["total_revenue"] + bill.final_amount, 2
        )
        supplier_revenue[sid]["bill_count"] += 1

    top_suppliers = sorted(supplier_revenue.values(), key=lambda x: x["total_revenue"], reverse=True)[:5]

    return MonthlyReportResponse(
        month=target_month,
        year=target_year,
        total_revenue=round(total_revenue, 2),
        total_paid=round(total_paid, 2),
        total_pending=round(total_pending, 2),
        total_bills=len(monthly_bills),
        paid_bills=paid_count,
        pending_bills=pending_count,
        top_suppliers=top_suppliers,
    )


# ─────────────────────────────────────────────
# GET ALL PAYMENTS
# ─────────────────────────────────────────────

async def get_all_payments() -> List[PaymentResponse]:
    db = get_firestore_client()
    docs = db.collection("payments").stream()
    return [_doc_to_payment(doc) for doc in docs]
