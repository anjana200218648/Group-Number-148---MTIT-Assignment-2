from fastapi import APIRouter, Request, HTTPException
import stripe
import os
import logging
from dotenv import load_dotenv
import json

load_dotenv()

router = APIRouter()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

logger = logging.getLogger(__name__)


@router.post("/webhook")
async def handle_webhook(request: Request):
    """
    Handle Stripe webhook events.
    
    This endpoint handles various Stripe events:
    - payment_intent.succeeded: Payment successful
    - payment_intent.payment_failed: Payment failed
    - payment_intent.canceled: Payment canceled
    - charge.refunded: Charge refunded
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    event = None
    
    try:
        if not STRIPE_WEBHOOK_SECRET:
            logger.warning("STRIPE_WEBHOOK_SECRET not configured - accepting all webhook requests")
            event = json.loads(payload)
        else:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle different event types
    event_type = event.get("type")
    event_data = event.get("data", {}).get("object", {})
    
    logger.info(f"Received webhook event: {event_type}")
    
    try:
        if event_type == "payment_intent.succeeded":
            await handle_payment_succeeded(event_data)
        
        elif event_type == "payment_intent.payment_failed":
            await handle_payment_failed(event_data)
        
        elif event_type == "payment_intent.canceled":
            await handle_payment_canceled(event_data)
        
        elif event_type == "charge.refunded":
            await handle_charge_refunded(event_data)
        
        elif event_type == "customer.subscription.created":
            await handle_subscription_created(event_data)
        
        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(event_data)
        
        else:
            logger.info(f"Unhandled event type: {event_type}")
        
        return {"success": True, "event_type": event_type}
    
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


async def handle_payment_succeeded(data: dict):
    """
    Handle successful payment events.
    
    Actions:
    - Log successful payment
    - Send confirmation email
    - Update subscription status
    - Update billing database
    """
    payment_intent_id = data.get("id")
    amount = data.get("amount")
    currency = data.get("currency", "usd").upper()
    customer_id = data.get("customer")
    metadata = data.get("metadata", {})
    
    logger.info(
        f"Payment succeeded: {payment_intent_id} | "
        f"Amount: {amount} {currency} | Customer: {customer_id}"
    )
    
    # TODO: Implement your custom logic here
    # - Update billing database
    # - Send confirmation email to customer
    # - Activate subscription
    # - Record transaction
    
    # Example database update (uncomment and implement):
    # await update_payment_status_in_db(
    #     payment_intent_id=payment_intent_id,
    #     status="completed",
    #     amount=amount,
    #     currency=currency,
    # )
    
    # Example email notification (uncomment and implement):
    # await send_payment_confirmation_email(customer_id, amount, currency)
    
    return {"status": "processed"}


async def handle_payment_failed(data: dict):
    """
    Handle failed payment events.
    
    Actions:
    - Log failed payment
    - Send failure notification
    - Trigger retry mechanism
    """
    payment_intent_id = data.get("id")
    amount = data.get("amount")
    customer_id = data.get("customer")
    last_payment_error = data.get("last_payment_error", {})
    error_message = last_payment_error.get("message", "Unknown error")
    
    logger.warning(
        f"Payment failed: {payment_intent_id} | "
        f"Error: {error_message} | Customer: {customer_id}"
    )
    
    # TODO: Implement your custom logic here
    # - Update billing database with failure status
    # - Send failure notification email
    # - Trigger retry mechanism
    # - Alert support team
    
    return {"status": "processed"}


async def handle_payment_canceled(data: dict):
    """
    Handle canceled payment events.
    
    Actions:
    - Log cancellation
    - Send cancellation notification
    - Update subscription status
    """
    payment_intent_id = data.get("id")
    customer_id = data.get("customer")
    
    logger.info(f"Payment canceled: {payment_intent_id} | Customer: {customer_id}")
    
    # TODO: Implement your custom logic here
    # - Update payment status to canceled
    # - Notify customer
    # - Cancel subscription if needed
    
    return {"status": "processed"}


async def handle_charge_refunded(data: dict):
    """
    Handle refund events.
    
    Actions:
    - Log refund
    - Send refund confirmation
    - Update subscription status
    """
    charge_id = data.get("id")
    amount_refunded = data.get("amount_refunded")
    customer_id = data.get("customer")
    
    logger.info(
        f"Charge refunded: {charge_id} | "
        f"Amount refunded: {amount_refunded} | Customer: {customer_id}"
    )
    
    # TODO: Implement your custom logic here
    # - Update transaction status to refunded
    # - Send refund notification
    # - Update customer balance
    
    return {"status": "processed"}


async def handle_subscription_created(data: dict):
    """
    Handle subscription creation events.
    
    Actions:
    - Log subscription
    - Store subscription details
    - Send welcome email
    """
    subscription_id = data.get("id")
    customer_id = data.get("customer")
    status = data.get("status")
    
    logger.info(
        f"Subscription created: {subscription_id} | "
        f"Customer: {customer_id} | Status: {status}"
    )
    
    # TODO: Implement your custom logic here
    # - Store subscription in database
    # - Send welcome email
    # - Activate features
    
    return {"status": "processed"}


async def handle_subscription_deleted(data: dict):
    """
    Handle subscription deletion events.
    
    Actions:
    - Log subscription deletion
    - Send cancellation email
    - Deactivate features
    """
    subscription_id = data.get("id")
    customer_id = data.get("customer")
    
    logger.info(f"Subscription deleted: {subscription_id} | Customer: {customer_id}")
    
    # TODO: Implement your custom logic here
    # - Update subscription status to canceled
    # - Send cancellation email
    # - Deactivate premium features
    
    return {"status": "processed"}


@router.get("/webhook-status")
async def webhook_status():
    """
    Health check endpoint for webhook handler.
    Useful for monitoring and debugging.
    """
    return {
        "status": "active",
        "webhook_secret_configured": bool(STRIPE_WEBHOOK_SECRET),
        "stripe_api_key_configured": bool(stripe.api_key),
    }
