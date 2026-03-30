import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Properly resolve the absolute base directory (where .env and service account key are located)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=env_path, override=True)

from app.database.firebase_config import initialize_firebase
from app.routes.order_routes import router as order_router
from app.utils.logger import logger

# ─────────────────────────────────────────────
# Lifespan: startup / shutdown
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Order Management Service starting up...")
    try:
        initialize_firebase()
        logger.info("✅ Firebase initialized")
    except Exception as e:
        logger.error(f"❌ Firebase initialization failed: {e}")
    yield
    logger.info("🛑 Order Management Service shutting down...")


# ─────────────────────────────────────────────
# App instance
# ─────────────────────────────────────────────
app = FastAPI(
    title="Order Management Service",
    description="""
## 🍽️ Restaurant Supply Chain – Order Management Microservice

This service handles all order operations for the restaurant supply chain system.

### Features
- **Order Creation** with auto-calculated total price
- **Status Workflow**: `Pending → Approved → Dispatched → Delivered / Cancelled`
- **Bulk Orders** with multiple items
- **Filtered Retrieval** by restaurant, supplier, or status
- **Validation & Error Handling**
- **Structured Logging**

### Status Transition Rules
| Current Status | Allowed Next |
|---|---|
| Pending | Approved, Cancelled |
| Approved | Dispatched, Cancelled |
| Dispatched | Delivered, Cancelled |
| Delivered | — (terminal) |
| Cancelled | — (terminal) |
    """,
    version="1.0.0",
    contact={"name": "Restaurant Supply Chain Team"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Global exception handler
# ─────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc} | path={request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "An unexpected error occurred", "detail": str(exc)},
    )

# ─────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────
app.include_router(order_router, prefix="/api/v1")

# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Health Check")
async def health_check():
    return {"status": "healthy", "service": "Order Management Service", "version": "1.0.0"}

@app.get("/", tags=["Root"], summary="Root")
async def root():
    return {
        "service": "Order Management Service",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
