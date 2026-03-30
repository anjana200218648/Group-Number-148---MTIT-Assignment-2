from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import suppliers, auth, performance  # Add performance import

# Initialize FastAPI app
app = FastAPI(
    title="Supplier Management Service",
    description="Microservice for managing hotel & restaurant suppliers with role-based access",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(suppliers.router)
app.include_router(performance.router)  # Add performance router

@app.get("/")
async def root():
    return {
        "service": "Supplier Management Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "port": 8081}