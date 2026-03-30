import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="API Gateway",
    description="Gateway for Supplier Management and Inventory Services",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service configurations
SERVICES = {
    "supplier": {
        "url": os.getenv("SUPPLIER_SERVICE_URL", "http://localhost:8081"),
        "prefix": "/api/supplier"
    },
    "inventory": {
        "url": os.getenv("INVENTORY_SERVICE_URL", "http://localhost:8082"),
        "prefix": "/api/inventory"
    }
}

# HTTP client for making requests to services
client = httpx.AsyncClient(timeout=30.0)


@app.on_event("shutdown")
async def shutdown_event():
    """Close HTTP client on shutdown"""
    await client.aclose()


@app.get("/")
async def root():
    """Gateway root endpoint"""
    return {
        "service": "API Gateway",
        "version": "1.0.0",
        "status": "running",
        "services": {
            name: {
                "url": config["url"],
                "prefix": config["prefix"]
            }
            for name, config in SERVICES.items()
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health_status = {}
    
    # Check each service health
    for name, config in SERVICES.items():
        try:
            response = await client.get(f"{config['url']}/health", timeout=5.0)
            health_status[name] = {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "url": config["url"],
                "response": response.status_code
            }
        except Exception as e:
            health_status[name] = {
                "status": "unhealthy",
                "url": config["url"],
                "error": str(e)
            }
    
    overall_status = "healthy" if all(
        s["status"] == "healthy" for s in health_status.values()
    ) else "degraded"
    
    return {
        "status": overall_status,
        "services": health_status
    }


@app.api_route("/{service}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy(service: str, path: str, request: Request):
    """
    Proxy requests to the appropriate microservice
    
    Examples:
    - GET /supplier/suppliers/ → Supplier Service
    - POST /inventory/items/ → Inventory Service
    """
    
    # Check if service exists
    if service not in SERVICES:
        return JSONResponse(
            status_code=404,
            content={
                "error": f"Service '{service}' not found",
                "available_services": list(SERVICES.keys())
            }
        )
    
    service_config = SERVICES[service]
    target_url = f"{service_config['url']}/{path}"
    
    # Get request body
    body = await request.body()
    
    # Forward headers (remove host)
    headers = dict(request.headers)
    headers.pop("host", None)
    
    logger.info(f"Proxying {request.method} {target_url}")
    
    try:
        # Forward the request
        response = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body,
            params=request.query_params,
            timeout=30.0
        )
        
        # Return response
        try:
            content = response.json()
        except:
            content = response.text
        
        return JSONResponse(
            status_code=response.status_code,
            content=content if isinstance(content, dict) else {"data": content}
        )
        
    except httpx.TimeoutException:
        logger.error(f"Timeout error for service {service}: {target_url}")
        return JSONResponse(
            status_code=504,
            content={"error": f"Service {service} timeout", "detail": "Gateway timeout"}
        )
    except httpx.ConnectError:
        logger.error(f"Connection error for service {service}: {target_url}")
        return JSONResponse(
            status_code=503,
            content={"error": f"Service {service} unavailable", "detail": "Service not reachable"}
        )
    except Exception as e:
        logger.error(f"Error proxying to {service}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal gateway error", "detail": str(e)}
        )


# Special route for service documentation
@app.get("/{service}/docs")
async def service_docs(service: str):
    """Get Swagger documentation for specific service"""
    
    if service not in SERVICES:
        return JSONResponse(
            status_code=404,
            content={"error": f"Service '{service}' not found"}
        )
    
    service_config = SERVICES[service]
    docs_url = f"{service_config['url']}/docs"
    
    try:
        response = await client.get(docs_url)
        return JSONResponse(
            status_code=response.status_code,
            content=response.json() if response.status_code == 200 else {"error": "Documentation not available"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"error": f"Cannot reach service documentation: {str(e)}"}
        )


# Service info endpoint
@app.get("/services")
async def list_services():
    """List all available services"""
    return {
        "services": {
            name: {
                "url": config["url"],
                "prefix": config["prefix"],
                "status": "active"
            }
            for name, config in SERVICES.items()
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "gateway:app",
        host="0.0.0.0",
        port=8080,
        reload=True
    )