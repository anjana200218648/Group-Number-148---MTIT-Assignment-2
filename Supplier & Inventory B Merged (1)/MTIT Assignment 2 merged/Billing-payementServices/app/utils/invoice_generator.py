"""
Invoice number generator utility.
"""

import uuid
from datetime import datetime


def generate_invoice_number() -> str:
    """
    Generates a unique invoice number in the format:
    INV-YYYYMM-XXXXX
    e.g. INV-202401-A3F9C
    """
    now = datetime.utcnow()
    date_part = now.strftime("%Y%m")
    unique_part = uuid.uuid4().hex[:5].upper()
    return f"INV-{date_part}-{unique_part}"


def generate_bill_id() -> str:
    """Generates a unique bill ID."""
    return f"BILL-{uuid.uuid4().hex[:8].upper()}"


def generate_payment_id() -> str:
    """Generates a unique payment ID."""
    return f"PAY-{uuid.uuid4().hex[:8].upper()}"
