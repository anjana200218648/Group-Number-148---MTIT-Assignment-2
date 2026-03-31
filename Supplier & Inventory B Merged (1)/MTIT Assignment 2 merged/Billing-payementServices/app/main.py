from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.billing_routes import router as billing_router
from app.routes.payment_routes import router as payment_router
from app.routes.webhook import router as webhook_router

app = FastAPI(
    title="Billing & Payment Microservice",
    description="Handles billing, invoice creation, payment tracking, and financial reports for Restaurant Supplier Management System",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(billing_router, prefix="/billing", tags=["Billing & Payments"])
app.include_router(payment_router, prefix="/api", tags=["Stripe Payments"])
app.include_router(webhook_router, prefix="/api", tags=["Webhooks"])


@app.get("/")
async def root():
    return {
        "service": "Billing & Payment Microservice",
        "version": "1.0.0",
        "status": "running",
        "port": 8086,
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "billing-payment-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8086, reload=True)
