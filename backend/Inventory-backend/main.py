import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from routes import items, reports, auth, suppliers
from core import firebase # Will initialize firebase on startup

logger = logging.getLogger(__name__)

tags_metadata = [
    {
        "name": "Items",
        "description": "Operations with inventory items. Includes complete CRUD for products.",
    },
    {
        "name": "Reports",
        "description": "Generate stock and analytics reports.",
    },
    {
        "name": "Suppliers",
        "description": "Manage and view supplier data.",
    },
    {
        "name": "Auth",
        "description": "Authentication and authorization endpoints.",
    },
]

app = FastAPI(
    title="Inventory / Stock Service API",
    description="Microservice for handling hotel and restaurant supplier stock. Fully compatible with API Gateways and follows RESTful principles.",
    version="1.1.0",
    openapi_tags=tags_metadata
)

# Enable CORS for the frontend on port 8000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(items.router)
app.include_router(reports.router)
app.include_router(auth.router)
app.include_router(suppliers.router)

@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "Inventory Stock Service"}

# Validation + error responses
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Keep `detail` for frontend compatibility; add status for consistency.
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail, "status": exc.status_code})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server error")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Run this file for dev: uvicorn main:app --host 0.0.0.1 --port 8082 --reload
