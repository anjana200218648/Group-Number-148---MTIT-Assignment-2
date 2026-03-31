from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    UPI = "upi"


class BillItem(BaseModel):
    item_name: str
    quantity: float
    unit_price: float
    total: Optional[float] = None

    def compute_total(self) -> float:
        return self.quantity * self.unit_price


class CreateBillRequest(BaseModel):
    order_id: str
    supplier_id: str
    supplier_name: Optional[str] = None
    items: List[BillItem]
    notes: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "order_id": "ORD-001",
                "supplier_id": "SUP-001",
                "supplier_name": "Fresh Farms Ltd",
                "items": [
                    {"item_name": "Tomatoes", "quantity": 100, "unit_price": 2.5},
                    {"item_name": "Onions", "quantity": 60, "unit_price": 1.8},
                ],
                "notes": "Bulk order for the week",
            }
        }


class BillResponse(BaseModel):
    bill_id: str
    invoice_number: str
    order_id: str
    supplier_id: str
    supplier_name: Optional[str] = None
    items: List[BillItem]
    subtotal: float
    discount_percentage: float
    discount_amount: float
    final_amount: float
    status: PaymentStatus
    notes: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


class ProcessPaymentRequest(BaseModel):
    bill_id: str
    payment_method: PaymentMethod
    paid_amount: float
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "bill_id": "BILL-001",
                "payment_method": "card",
                "paid_amount": 450.00,
                "transaction_reference": "TXN-20240101-001",
                "notes": "Paid via corporate card",
            }
        }


class PaymentResponse(BaseModel):
    payment_id: str
    bill_id: str
    invoice_number: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    payment_method: PaymentMethod
    paid_amount: float
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    payment_date: str


class MonthlyReportResponse(BaseModel):
    month: int
    year: int
    total_revenue: float
    total_paid: float
    total_pending: float
    total_bills: int
    paid_bills: int
    pending_bills: int
    top_suppliers: List[dict]
    monthly_breakdown: Optional[dict] = None


class SupplierBillingSummary(BaseModel):
    supplier_id: str
    supplier_name: Optional[str] = None
    total_bills: int
    total_amount: float
    paid_amount: float
    pending_amount: float
    bills: List[BillResponse]
