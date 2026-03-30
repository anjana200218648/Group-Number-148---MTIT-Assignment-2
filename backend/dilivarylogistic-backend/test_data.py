# Create a test script test_data.py
import asyncio
from datetime import datetime
from models.delivery import DeliveryOrder, HotelInfo, CustomerInfo, OrderSize, DeliveryStatus
from services.delivery_service import DeliveryService

async def create_test_delivery():
    service = DeliveryService()
    
    order = DeliveryOrder(
        order_id="TEST001",
        hotel_info=HotelInfo(
            hotel_id="123",
            hotel_name="Test Hotel",
            hotel_cono="TEST123",
            address="123 Test Street",
            phone="+1234567890",
            latitude=6.9271,
            longitude=79.8612
        ),
        customer_info=CustomerInfo(
            name="Test Customer",
            phone="+9876543210",
            address="456 Test Avenue",
            latitude=6.9344,
            longitude=79.8428
        ),
        order_size=OrderSize.MEDIUM,
        status=DeliveryStatus.PENDING
    )
    
    result = await service.create_delivery(order)
    print(result)

if __name__ == "__main__":
    asyncio.run(create_test_delivery())