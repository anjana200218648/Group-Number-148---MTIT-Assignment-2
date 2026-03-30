from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime, timedelta
from app.services.performance_service import PerformanceService
from app.services.supplier_service import SupplierService
from app.models.performance import PerformanceMetric, SupplierPerformanceScore
from app.models.supplier import Supplier
from app.middleware.auth_middleware import AuthMiddleware
from app.models.user import TokenData

router = APIRouter(prefix="/performance", tags=["Performance"])


@router.get("/supplier/{supplier_id}", response_model=SupplierPerformanceScore)
async def get_supplier_performance(
    supplier_id: str,
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """
    Get performance score for a specific supplier
    
    - **supplier_id**: Unique identifier of the supplier
    - Returns overall performance score with detailed metrics
    """
    # Check permission
    await AuthMiddleware.check_permission(token_data, "performance:view")
    
    # Verify supplier exists
    supplier = await SupplierService.get_supplier(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Get performance score
    performance = await PerformanceService.get_supplier_performance(supplier_id)
    if not performance:
        raise HTTPException(
            status_code=404, 
            detail="No performance data available for this supplier"
        )
    
    return performance


@router.post("/supplier/{supplier_id}/record", response_model=SupplierPerformanceScore)
async def record_performance_metric(
    supplier_id: str,
    metric: PerformanceMetric,
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """
    Record a new performance metric for a supplier
    """
    # Check permission
    await AuthMiddleware.check_permission(token_data, "performance:update")
    
    # Verify supplier exists
    supplier = await SupplierService.get_supplier(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Set supplier_id in metric (after validation)
    metric.supplier_id = supplier_id  # ← This line already exists
    
    # Record the metric
    await PerformanceService.record_metric(metric)
    
    # Get updated performance score
    performance = await PerformanceService.calculate_performance_score(supplier_id)
    
    return performance


@router.get("/supplier/{supplier_id}/metrics", response_model=List[PerformanceMetric])
async def get_performance_metrics(
    supplier_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of records to return"),
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """
    Get all performance metrics for a supplier within a time range
    
    - **supplier_id**: Unique identifier of the supplier
    - **days**: Number of days to look back (default: 30)
    - **limit**: Maximum number of records to return (default: 50)
    """
    # Check permission
    await AuthMiddleware.check_permission(token_data, "performance:view")
    
    # Verify supplier exists
    supplier = await SupplierService.get_supplier(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Calculate cutoff date
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Get metrics from service
    metrics = await PerformanceService.get_supplier_metrics(supplier_id, cutoff_date, limit)
    
    return metrics


@router.get("/top-rated", response_model=List[dict])
async def get_top_rated_suppliers(
    limit: int = Query(10, ge=1, le=50, description="Number of suppliers to return"),
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """
    Get top-rated suppliers based on performance scores
    
    - **limit**: Number of top suppliers to return (default: 10)
    """
    # Check permission
    await AuthMiddleware.check_permission(token_data, "performance:view")
    
    # Get top rated suppliers
    top_suppliers = await PerformanceService.get_top_performing_suppliers(limit)
    
    return top_suppliers


@router.get("/stats/summary", response_model=dict)
async def get_performance_summary(
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """
    Get overall performance summary across all suppliers
    
    Returns:
    - Average scores across all suppliers
    - Total number of suppliers with performance data
    - Performance distribution
    """
    # Check permission
    await AuthMiddleware.check_permission(token_data, "performance:view")
    
    summary = await PerformanceService.get_performance_summary()
    
    return summary


@router.get("/supplier/{supplier_id}/trends", response_model=dict)
async def get_performance_trends(
    supplier_id: str,
    days: int = Query(90, ge=7, le=365, description="Number of days to analyze"),
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """
    Get performance trends over time for a supplier
    
    - **supplier_id**: Unique identifier of the supplier
    - **days**: Number of days to analyze (default: 90)
    """
    # Check permission
    await AuthMiddleware.check_permission(token_data, "performance:view")
    
    # Verify supplier exists
    supplier = await SupplierService.get_supplier(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    trends = await PerformanceService.get_performance_trends(supplier_id, days)
    
    return trends


@router.post("/supplier/{supplier_id}/recalculate", response_model=SupplierPerformanceScore)
async def recalculate_performance(
    supplier_id: str,
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """
    Force recalculation of performance score for a supplier
    
    - **supplier_id**: Unique identifier of the supplier
    - Useful after data corrections or imports
    """
    # Check permission (admin only)
    await AuthMiddleware.check_permission(token_data, "performance:update")
    
    # Verify supplier exists
    supplier = await SupplierService.get_supplier(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Recalculate performance
    performance = await PerformanceService.calculate_performance_score(supplier_id)
    
    if not performance:
        raise HTTPException(
            status_code=404,
            detail="No performance metrics found to calculate score"
        )
    
    return performance


@router.delete("/supplier/{supplier_id}/metrics/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_performance_metric(
    supplier_id: str,
    metric_id: str,
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """
    Delete a specific performance metric (Admin only)
    
    - **supplier_id**: Unique identifier of the supplier
    - **metric_id**: Unique identifier of the metric to delete
    """
    # Check permission (admin only)
    await AuthMiddleware.check_permission(token_data, "performance:update")
    
    # Delete metric
    deleted = await PerformanceService.delete_metric(supplier_id, metric_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Performance metric not found")
    
    # Recalculate performance after deletion
    await PerformanceService.calculate_performance_score(supplier_id)
    
    return None


@router.get("/dashboard/stats", response_model=dict)
async def get_dashboard_stats(
    token_data: TokenData = Depends(AuthMiddleware.verify_token)
):
    """
    Get dashboard statistics for quick overview
    
    Returns:
    - Total suppliers
    - Active suppliers count
    - Average performance score
    - Suppliers needing attention (score < 60)
    """
    # Check permission
    await AuthMiddleware.check_permission(token_data, "performance:view")
    
    stats = await PerformanceService.get_dashboard_stats()
    
    return stats