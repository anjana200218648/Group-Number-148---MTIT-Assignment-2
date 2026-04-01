# services/vehicle_service.py

from models.delivery import OrderSize, VehicleType, VehicleRequirement

class VehicleAssignmentService:
    
    # Vehicle requirements mapping
    VEHICLE_REQUIREMENTS = {
        OrderSize.SMALL: VehicleRequirement(
            order_size=OrderSize.SMALL,
            recommended_vehicle=VehicleType.MOTORCYCLE,
            max_distance_km=15.0,
            max_weight_kg=5.0,
            min_weight_kg=0,
            description="Small orders like documents, small packages",
            base_cost=50,
            cost_per_km=10
        ),
        OrderSize.MEDIUM: VehicleRequirement(
            order_size=OrderSize.MEDIUM,
            recommended_vehicle=VehicleType.CAR,
            max_distance_km=25.0,
            max_weight_kg=50.0,
            min_weight_kg=5.0,
            description="Medium orders like food parcels, small boxes",
            base_cost=70,
            cost_per_km=12
        ),
        OrderSize.LARGE: VehicleRequirement(
            order_size=OrderSize.LARGE,
            recommended_vehicle=VehicleType.VAN,
            max_distance_km=40.0,
            max_weight_kg=200.0,
            min_weight_kg=20.0,
            description="Large orders like multiple boxes, furniture",
            base_cost=100,
            cost_per_km=15
        ),
        OrderSize.EXTRA_LARGE: VehicleRequirement(
            order_size=OrderSize.EXTRA_LARGE,
            recommended_vehicle=VehicleType.TRUCK,
            max_distance_km=100.0,
            max_weight_kg=1000.0,
            min_weight_kg=100.0,
            description="Extra large orders like bulk items, equipment",
            base_cost=150,
            cost_per_km=18
        )
    }
    
    @classmethod
    def get_vehicle_for_order_size(cls, order_size: OrderSize) -> VehicleRequirement:
        """Get recommended vehicle based on order size"""
        return cls.VEHICLE_REQUIREMENTS.get(order_size)
    
    @classmethod
    def get_all_vehicle_requirements(cls) -> dict:
        """Get all vehicle requirements"""
        return cls.VEHICLE_REQUIREMENTS
    
    @classmethod
    def validate_vehicle_for_order(cls, order_size: OrderSize, vehicle_type: VehicleType) -> bool:
        """Validate if vehicle type is appropriate for order size"""
        requirement = cls.get_vehicle_for_order_size(order_size)
        if requirement:
            return requirement.recommended_vehicle == vehicle_type
        return False