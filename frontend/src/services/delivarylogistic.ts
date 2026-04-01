import axios from 'axios';
import { 
  DeliveryOrder, 
  DeliveryUpdate, 
  VehicleRequirement, 
  DeliveryStatistics,
  Driver,
  DriverStatus,
  VehicleType
} from '../types/delivery.types';

// Vite uses import.meta.env instead of process.env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8084/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add interceptors for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`📥 API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.data);
    return Promise.reject(error);
  }
);

export const deliveryApi = {
  // ==================== ORDER MANAGEMENT ====================
  
  createDelivery: async (order: DeliveryOrder) => {
    const response = await api.post('/delivery/orders', order);
    return response.data;
  },

  createBatchDelivery: async (orders: DeliveryOrder[]) => {
    const response = await api.post('/delivery/orders/batch', orders);
    return response.data;
  },

  getDelivery: async (orderId: string) => {
    const response = await api.get(`/delivery/orders/${orderId}`);
    return response.data;
  },

  updateDeliveryStatus: async (orderId: string, update: DeliveryUpdate) => {
    const response = await api.put(`/delivery/orders/${orderId}/status`, update);
    return response.data;
  },

  deleteDelivery: async (orderId: string) => {
    try {
      const response = await api.delete(`/delivery/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting delivery:', error);
      throw error;
    }
  },

  bulkUpdateStatus: async (updates: Array<{order_id: string, update: DeliveryUpdate}>) => {
    const response = await api.post('/delivery/orders/bulk-update', updates);
    return response.data;
  },

  // ==================== TRACKING & LOCATION ====================
  
  trackDelivery: async (orderId: string) => {
    const response = await api.get(`/delivery/orders/${orderId}/track`);
    return response.data;
  },

  updateDriverLocation: async (orderId: string, latitude: number, longitude: number) => {
    try {
      const response = await api.post('/delivery/location/update', {
        order_id: orderId,
        latitude: latitude,
        longitude: longitude
      });
      return response.data;
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  },

  getDriverLocation: async (orderId: string) => {
    try {
      const response = await api.get(`/delivery/location/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting driver location:', error);
      throw error;
    }
  },

  calculateETA: async (orderId: string, lat: number, lng: number) => {
    const response = await api.get(`/delivery/eta/${orderId}`, {
      params: { lat, lng }
    });
    return response.data;
  },

  // ==================== DRIVER MANAGEMENT ====================
  
  getAllDrivers: async (status?: DriverStatus, vehicleType?: VehicleType) => {
    const params: any = {};
    if (status) params.status = status;
    if (vehicleType) params.vehicle_type = vehicleType;
    const response = await api.get('/delivery/drivers', { params });
    return response.data;
  },

  getAvailableDrivers: async (vehicleType?: VehicleType) => {
    const params: any = {};
    if (vehicleType) params.vehicle_type = vehicleType;
    const response = await api.get('/delivery/drivers/available', { params });
    return response.data;
  },

  getDriver: async (driverId: string) => {
    const response = await api.get(`/delivery/drivers/${driverId}`);
    return response.data;
  },

  createDriver: async (driver: Driver) => {
    const response = await api.post('/delivery/drivers', driver);
    return response.data;
  },

  updateDriverStatus: async (driverId: string, status: DriverStatus) => {
    const response = await api.put(`/delivery/drivers/${driverId}/status`, status);
    return response.data;
  },

  getDriverDeliveries: async (driverId: string, limit?: number) => {
    const params: any = {};
    if (limit) params.limit = limit;
    const response = await api.get(`/delivery/drivers/${driverId}/deliveries`, { params });
    return response.data;
  },

  updateDriverRating: async (driverId: string, rating: number) => {
    const response = await api.put(`/delivery/drivers/${driverId}/rating`, { rating });
    return response.data;
  },

  // ==================== VEHICLE MANAGEMENT ====================
  
  getVehicleRequirements: async (orderSize?: string) => {
    const url = orderSize 
      ? `/delivery/vehicle-requirements?order_size=${orderSize}`
      : '/delivery/vehicle-requirements';
    const response = await api.get(url);
    return response.data;
  },

  getVehicleSpecifications: async () => {
    const response = await api.get('/delivery/vehicles/specs');
    return response.data;
  },

  // ==================== ESTIMATES & CALCULATIONS ====================
  
  /**
   * Calculate detailed delivery estimate with driver location and destination type
   * @param data - Can be DeliveryOrder or extended object with driver_location and destination_type
   */
  calculateDetailedEstimate: async (data: any): Promise<any> => {
    try {
      // Check if driver location is provided
      const hasDriverLocation = data.driver_location && 
                                 data.driver_location.latitude && 
                                 data.driver_location.longitude;
      
      // Check if destination type is provided
      const hasDestinationType = data.destination_type && 
                                  (data.destination_type === 'hotel' || data.destination_type === 'customer');
      
      // Prepare request body
      const requestBody: any = {
        hotel_info: data.hotel_info,
        customer_info: data.customer_info,
        items: data.items,
        order_size: data.order_size,
      };
      
      // Add driver location if provided
      if (hasDriverLocation) {
        requestBody.driver_location = {
          latitude: data.driver_location.latitude,
          longitude: data.driver_location.longitude
        };
      }
      
      // Add destination type if provided
      if (hasDestinationType) {
        requestBody.destination_type = data.destination_type;
      }
      
      // Add destination coordinates if provided
      if (data.destination_coordinates) {
        requestBody.destination_coordinates = {
          latitude: data.destination_coordinates.latitude,
          longitude: data.destination_coordinates.longitude
        };
      }
      
      console.log('📊 Calculating detailed estimate with:', {
        hasDriverLocation,
        hasDestinationType,
        driverLocation: hasDriverLocation ? requestBody.driver_location : null,
        destinationType: hasDestinationType ? requestBody.destination_type : null
      });
      
      const response = await api.post('/delivery/orders/calculate-detailed', requestBody);
      return response.data;
    } catch (error) {
      console.error('Error calculating detailed estimate:', error);
      throw error;
    }
  },

  /**
   * Calculate delivery estimate from hotel to customer (legacy method)
   */
  calculateEstimate: async (order: DeliveryOrder) => {
    const response = await api.post('/delivery/orders/calculate', order);
    return response.data;
  },

  getDeliveryCost: async (orderId: string) => {
    const response = await api.get(`/delivery/orders/${orderId}/cost`);
    return response.data;
  },

  // ==================== HOTEL/STORE MANAGEMENT ====================
  
  getHotelDeliveries: async (hotelId: string, limit?: number) => {
    const params: any = {};
    if (limit) params.limit = limit;
    const response = await api.get(`/delivery/hotel/${hotelId}/deliveries`, { params });
    return response.data;
  },

  getHotelDeliveryStatistics: async (hotelId: string) => {
    const response = await api.get(`/delivery/hotel/${hotelId}/statistics`);
    return response.data;
  },

  // ==================== ANALYTICS & REPORTS ====================
  
  getDeliveryStatistics: async (hotelId?: string) => {
    const url = hotelId 
      ? `/delivery/statistics?hotel_id=${hotelId}`
      : '/delivery/statistics';
    const response = await api.get(url);
    return response.data;
  },

  getDriverPerformance: async (startDate?: string, endDate?: string, driverId?: string) => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (driverId) params.driver_id = driverId;
    const response = await api.get('/delivery/analytics/driver-performance', { params });
    return response.data;
  },

  getRouteEfficiency: async (date?: string) => {
    const params: any = {};
    if (date) params.date = date;
    const response = await api.get('/delivery/analytics/route-efficiency', { params });
    return response.data;
  },

  getCostAnalysis: async (startDate?: string, endDate?: string) => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get('/delivery/analytics/cost-analysis', { params });
    return response.data;
  },

  // ==================== BULK OPERATIONS ====================
  
  getAllDeliveries: async (limit?: number, status?: string, startDate?: string, endDate?: string) => {
    const params: any = {};
    if (limit) params.limit = limit;
    if (status) params.status = status;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get('/delivery/all-deliveries', { params });
    return response.data;
  },

  // ==================== PROOF OF DELIVERY ====================
  
  uploadProofOfDelivery: async (orderId: string, proofUrl?: string, signature?: string) => {
    const response = await api.post(`/delivery/orders/${orderId}/proof`, {
      proof_url: proofUrl,
      signature: signature
    });
    return response.data;
  },

  // ==================== NOTIFICATIONS ====================
  
  testNotification: async (phone: string, message: string) => {
    const response = await api.post('/delivery/notifications/test', { phone, message });
    return response.data;
  },

  // ==================== HEALTH CHECK ====================
  
  healthCheck: async () => {
    const response = await api.get('/delivery/health/details');
    return response.data;
  }
};

export default api;