import api from './api';
import { Supplier, PerformanceScore } from '../types';

export const supplierService = {
  // Get all suppliers
  getAll: async (params?: { status?: string; category?: string; limit?: number }) => {
    const response = await api.get('/suppliers/', { params });
    return response.data;
  },

  // Get single supplier
  getById: async (id: string): Promise<Supplier> => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  },

  // Create supplier
  create: async (data: Partial<Supplier>): Promise<Supplier> => {
    const response = await api.post('/suppliers/', data);
    return response.data;
  },

  // Update supplier
  update: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data;
  },

  // Delete supplier
  delete: async (id: string): Promise<void> => {
    await api.delete(`/suppliers/${id}`);
  },

  // Get performance - Use performance router
  getPerformance: async (id: string): Promise<PerformanceScore> => {
    const response = await api.get(`/performance/supplier/${id}`);
    return response.data;
  },

  // Record performance - Use performance router
  recordPerformance: async (supplierId: string, data: any): Promise<PerformanceScore> => {
    // Format dates for backend
    const formattedData = {
      order_id: data.order_id,
      delivery_time_actual: new Date(data.delivery_time_actual).toISOString(),
      delivery_time_expected: new Date(data.delivery_time_expected).toISOString(),
      delivery_status: data.delivery_status,
      quality_rating: data.quality_rating,
      comments: data.comments || ''
    };
    
    const response = await api.post(`/performance/supplier/${supplierId}/record`, formattedData);
    return response.data;
  },
};