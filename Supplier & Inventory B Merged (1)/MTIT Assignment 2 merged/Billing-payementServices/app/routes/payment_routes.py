# app/routes/payment_routes.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import stripe
import os

router = APIRouter()

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class CreatePaymentIntentRequest(BaseModel):
    amount: float
    currency: str = "lkr"
    bill_id: str
    invoice_number: str

@router.post("/create-payment-intent")
async def create_payment_intent(request: CreatePaymentIntentRequest):
    """
    Create Stripe Payment Intent
    """
    try:
        # Convert amount to cents (Stripe requires smallest currency unit)
        amount_in_cents = int(request.amount * 100)
        
        payment_intent = stripe.PaymentIntent.create(
            amount=amount_in_cents,
            currency=request.currency,
            metadata={
                "bill_id": request.bill_id,
                "invoice_number": request.invoice_number
            },
            description=f"Payment for invoice {request.invoice_number}",
            receipt_email=None  # You can add customer email here
        )
        
        return {
            "clientSecret": payment_intent.client_secret,
            "paymentIntentId": payment_intent.id
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event.type == 'payment_intent.succeeded':
        payment_intent = event.data.object
        # Update bill status in database
        bill_id = payment_intent.metadata.get("bill_id")
        if bill_id:
            # Update bill status to 'paid' in Firestore
            db = get_firestore_client()
            db.collection("bills").document(bill_id).update({
                "status": "paid",
                "updated_at": datetime.utcnow().isoformat()
            })
            
            # Create payment record
            payment_data = {
                "payment_id": f"PAY-{uuid.uuid4().hex[:8].upper()}",
                "bill_id": bill_id,
                "invoice_number": payment_intent.metadata.get("invoice_number"),
                "payment_method": "card",
                "paid_amount": payment_intent.amount / 100,
                "transaction_reference": payment_intent.id,
                "payment_date": datetime.utcnow().isoformat(),
            }
            db.collection("payments").document(payment_data["payment_id"]).set(payment_data)
    
    return {"status": "success"}