from app.models.supplier import Supplier, CreateSupplierRequest, UpdateSupplierRequest, SupplierStatus
from app.config.firebase_config import db
from datetime import datetime
from typing import List, Optional
import uuid

class SupplierService:
    COLLECTION_NAME = 'suppliers'
    
    @staticmethod
    async def create_supplier(request: CreateSupplierRequest, created_by: str) -> Supplier:
        """Create a new supplier"""
        supplier_id = str(uuid.uuid4())
        supplier_code = f"SUP-{datetime.now().strftime('%Y%m')}-{supplier_id[:4].upper()}"
        
        supplier = Supplier(
            id=supplier_id,
            supplier_code=supplier_code,
            company_name=request.company_name,
            contact_person=request.contact_person,
            contact_info=request.contact_info,
            bank_info=request.bank_info,
            categories=request.categories,
            created_by=created_by
        )
        
        db.collection(SupplierService.COLLECTION_NAME).document(supplier_id).set(supplier.dict())
        return supplier
    
    @staticmethod
    async def get_supplier(supplier_id: str) -> Optional[Supplier]:
        """Get supplier by ID"""
        doc = db.collection(SupplierService.COLLECTION_NAME).document(supplier_id).get()
        if doc.exists:
            data = doc.to_dict()
            data['id'] = doc.id
            return Supplier(**data)
        return None
    
    @staticmethod
    async def get_all_suppliers(status: Optional[SupplierStatus] = None, 
                                 category: Optional[str] = None,
                                 limit: int = 100) -> List[Supplier]:
        """Get all suppliers with filters"""
        query = db.collection(SupplierService.COLLECTION_NAME)
        
        if status:
            query = query.where("status", "==", status.value)
        
        if category:
            query = query.where("categories", "array_contains", category)
        
        docs = query.limit(limit).stream()
        
        suppliers = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            suppliers.append(Supplier(**data))
        
        return suppliers
    
    @staticmethod
    async def update_supplier(supplier_id: str, request: UpdateSupplierRequest) -> Optional[Supplier]:
        """Update supplier information"""
        supplier = await SupplierService.get_supplier(supplier_id)
        if not supplier:
            return None
        
        update_data = request.dict(exclude_unset=True)
        update_data['updated_at'] = datetime.now()
        
        db.collection(SupplierService.COLLECTION_NAME).document(supplier_id).update(update_data)
        
        return await SupplierService.get_supplier(supplier_id)
    
    @staticmethod
    async def delete_supplier(supplier_id: str) -> bool:
        """Soft delete supplier (set status to inactive)"""
        supplier = await SupplierService.get_supplier(supplier_id)
        if not supplier:
            return False
        
        db.collection(SupplierService.COLLECTION_NAME).document(supplier_id).update({
            'status': SupplierStatus.INACTIVE,
            'updated_at': datetime.now()
        })
        return True
    
    @staticmethod
    async def update_rating(supplier_id: str, new_rating: float):
        """Update supplier rating and performance metrics"""
        # Import inside function to avoid circular import
        from app.services.performance_service import PerformanceService
        
        # Get latest performance score
        performance = await PerformanceService.get_supplier_performance(supplier_id)
        
        if performance:
            # Update all performance metrics in supplier document
            db.collection(SupplierService.COLLECTION_NAME).document(supplier_id).update({
                'rating': new_rating,
                'on_time_delivery_rate': performance.on_time_score,
                'quality_score': performance.quality_score,
                'total_orders': performance.total_orders,
                'updated_at': datetime.now()
            })
        else:
            # Just update rating if no performance data
            db.collection(SupplierService.COLLECTION_NAME).document(supplier_id).update({
                'rating': new_rating,
                'updated_at': datetime.now()
            })

    @staticmethod
    async def update_performance_metrics(supplier_id: str):
        """Update supplier with latest performance metrics"""
        # Import inside function to avoid circular import
        from app.services.performance_service import PerformanceService
        
        performance = await PerformanceService.get_supplier_performance(supplier_id)
        
        if performance:
            db.collection(SupplierService.COLLECTION_NAME).document(supplier_id).update({
                'on_time_delivery_rate': performance.on_time_score,
                'quality_score': performance.quality_score,
                'total_orders': performance.total_orders,
                'rating': (performance.overall_score / 100) * 5,
                'updated_at': datetime.now()
            })
            return True
        return False