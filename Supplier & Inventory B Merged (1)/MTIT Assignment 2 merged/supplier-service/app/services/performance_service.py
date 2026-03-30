from app.models.performance import PerformanceMetric, SupplierPerformanceScore, DeliveryStatus
from app.config.firebase_config import db
from datetime import datetime, timedelta 
from typing import List
import numpy as np

class PerformanceService:
    PERFORMANCE_COLLECTION = 'supplier_performance'
    METRICS_COLLECTION = 'performance_metrics'
    
    @staticmethod
    async def record_metric(metric: PerformanceMetric):
        """Record a performance metric for a supplier"""
        metric_id = f"{metric.supplier_id}_{metric.order_id}"
        db.collection(PerformanceService.METRICS_COLLECTION).document(metric_id).set(metric.dict())
        
        # Update performance score
        await PerformanceService.calculate_performance_score(metric.supplier_id)
    
    @staticmethod
    async def calculate_performance_score(supplier_id: str):
        """Calculate overall performance score for a supplier"""
        # Get last 90 days of metrics
        cutoff_date = datetime.now() - timedelta(days=90)
        
        # Query without order_by to avoid index requirement
        metrics_query = db.collection(PerformanceService.METRICS_COLLECTION)\
            .where("supplier_id", "==", supplier_id)\
            .where("recorded_at", ">=", cutoff_date)\
            .stream()
        
        metrics = []
        for doc in metrics_query:
            data = doc.to_dict()
            metrics.append(PerformanceMetric(**data))
        
        if not metrics:
            return None
        
        # Calculate scores
        total_orders = len(metrics)
        # Count on_time and early as successful deliveries
        on_time_orders = sum(1 for m in metrics if m.delivery_status in [DeliveryStatus.ON_TIME, DeliveryStatus.EARLY])
        on_time_score = (on_time_orders / total_orders) * 100 if total_orders > 0 else 0
        
        quality_scores = [m.quality_rating for m in metrics]
        avg_quality = np.mean(quality_scores) if quality_scores else 0
        quality_score = (avg_quality / 5) * 100
        
        # Weighted overall score (70% delivery, 30% quality)
        overall_score = (on_time_score * 0.7) + (quality_score * 0.3)
        
        performance_score = SupplierPerformanceScore(
            supplier_id=supplier_id,
            overall_score=round(overall_score, 2),
            on_time_score=round(on_time_score, 2),
            quality_score=round(quality_score, 2),
            total_orders=total_orders,
            on_time_orders=on_time_orders,
            average_quality_rating=round(avg_quality, 2),
            last_updated=datetime.now()
        )
        
        # Store performance score
        db.collection(PerformanceService.PERFORMANCE_COLLECTION).document(supplier_id).set(performance_score.dict())
        
        # Update supplier with latest performance metrics
        await PerformanceService._update_supplier_performance(supplier_id, performance_score)
        
        return performance_score
    
    @staticmethod
    async def _update_supplier_performance(supplier_id: str, performance_score: SupplierPerformanceScore):
        """Update supplier document with latest performance metrics"""
        # Import inside function to avoid circular import
        from app.services.supplier_service import SupplierService
        
        try:
            supplier_ref = db.collection('suppliers').document(supplier_id)
            supplier_ref.update({
                'on_time_delivery_rate': performance_score.on_time_score,
                'quality_score': performance_score.quality_score,
                'total_orders': performance_score.total_orders,
                'rating': (performance_score.overall_score / 100) * 5,
                'updated_at': datetime.now()
            })
        except Exception as e:
            print(f"Error updating supplier performance: {e}")
    
    @staticmethod
    async def get_supplier_performance(supplier_id: str):
        """Get performance score for a supplier"""
        doc = db.collection(PerformanceService.PERFORMANCE_COLLECTION).document(supplier_id).get()
        if doc.exists:
            return SupplierPerformanceScore(**doc.to_dict())
        return None

    # Rest of the methods remain the same...
    @staticmethod
    async def get_supplier_metrics(supplier_id: str, cutoff_date: datetime, limit: int) -> List[PerformanceMetric]:
        """Get performance metrics for a supplier"""
        metrics_query = db.collection(PerformanceService.METRICS_COLLECTION)\
            .where("supplier_id", "==", supplier_id)\
            .where("recorded_at", ">=", cutoff_date)\
            .stream()
        
        metrics = []
        for doc in metrics_query:
            data = doc.to_dict()
            metrics.append(PerformanceMetric(**data))
        
        metrics.sort(key=lambda x: x.recorded_at, reverse=True)
        return metrics[:limit]

    @staticmethod
    async def get_top_performing_suppliers(limit: int) -> List[dict]:
        """Get top performing suppliers"""
        scores_query = db.collection(PerformanceService.PERFORMANCE_COLLECTION).stream()
        
        all_scores = []
        for doc in scores_query:
            data = doc.to_dict()
            all_scores.append(data)
        
        all_scores.sort(key=lambda x: x.get('overall_score', 0), reverse=True)
        top_scores = all_scores[:limit]
        
        top_suppliers = []
        for data in top_scores:
            supplier_doc = db.collection('suppliers').document(data['supplier_id']).get()
            if supplier_doc.exists:
                supplier_data = supplier_doc.to_dict()
                top_suppliers.append({
                    'supplier_id': data['supplier_id'],
                    'supplier_name': supplier_data.get('company_name'),
                    'overall_score': data['overall_score'],
                    'on_time_score': data['on_time_score'],
                    'quality_score': data['quality_score'],
                    'total_orders': data['total_orders']
                })
        
        return top_suppliers

    @staticmethod
    async def get_performance_summary() -> dict:
        """Get overall performance summary"""
        scores = db.collection(PerformanceService.PERFORMANCE_COLLECTION).stream()
        
        total_score = 0
        count = 0
        distribution = {
            'excellent': 0,
            'good': 0,
            'average': 0,
            'poor': 0,
            'critical': 0
        }
        
        for doc in scores:
            data = doc.to_dict()
            score = data.get('overall_score', 0)
            total_score += score
            count += 1
            
            if score >= 90:
                distribution['excellent'] += 1
            elif score >= 75:
                distribution['good'] += 1
            elif score >= 60:
                distribution['average'] += 1
            elif score >= 40:
                distribution['poor'] += 1
            else:
                distribution['critical'] += 1
        
        avg_score = total_score / count if count > 0 else 0
        
        return {
            'total_suppliers_with_data': count,
            'average_overall_score': round(avg_score, 2),
            'performance_distribution': distribution,
            'best_category': max(distribution, key=distribution.get) if count > 0 else None
        }

    @staticmethod
    async def get_performance_trends(supplier_id: str, days: int) -> dict:
        """Get performance trends over time"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        metrics_query = db.collection(PerformanceService.METRICS_COLLECTION)\
            .where("supplier_id", "==", supplier_id)\
            .where("recorded_at", ">=", cutoff_date)\
            .stream()
        
        metrics_list = []
        for doc in metrics_query:
            data = doc.to_dict()
            metrics_list.append(PerformanceMetric(**data))
        
        metrics_list.sort(key=lambda x: x.recorded_at)
        
        trends = {
            'dates': [],
            'quality_ratings': [],
            'delivery_status': {
                'on_time': 0,
                'delayed': 0,
                'early': 0
            }
        }
        
        for metric in metrics_list:
            trends['dates'].append(metric.recorded_at.strftime('%Y-%m-%d'))
            trends['quality_ratings'].append(metric.quality_rating)
            trends['delivery_status'][metric.delivery_status.value] += 1
        
        return trends

    @staticmethod
    async def delete_metric(supplier_id: str, metric_id: str) -> bool:
        """Delete a performance metric"""
        doc_ref = db.collection(PerformanceService.METRICS_COLLECTION).document(metric_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return False
        
        data = doc.to_dict()
        if data.get('supplier_id') != supplier_id:
            return False
        
        doc_ref.delete()
        await PerformanceService.calculate_performance_score(supplier_id)
        
        return True

    @staticmethod
    async def get_dashboard_stats() -> dict:
        """Get dashboard statistics"""
        suppliers = db.collection('suppliers').where("status", "==", "active").stream()
        active_suppliers = sum(1 for _ in suppliers)
        
        all_suppliers = db.collection('suppliers').stream()
        total_suppliers = sum(1 for _ in all_suppliers)
        
        scores = db.collection(PerformanceService.PERFORMANCE_COLLECTION).stream()
        
        total_score = 0
        count = 0
        needs_attention = 0
        
        for doc in scores:
            data = doc.to_dict()
            score = data.get('overall_score', 0)
            total_score += score
            count += 1
            if score < 60:
                needs_attention += 1
        
        avg_score = total_score / count if count > 0 else 0
        
        return {
            'total_suppliers': total_suppliers,
            'active_suppliers': active_suppliers,
            'suppliers_with_performance': count,
            'average_performance_score': round(avg_score, 2),
            'suppliers_needing_attention': needs_attention,
            'performance_coverage': round((count / total_suppliers * 100), 2) if total_suppliers > 0 else 0
        }