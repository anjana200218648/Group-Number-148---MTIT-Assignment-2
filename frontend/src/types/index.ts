export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
}

export interface BankInfo {
  bank_name: string;
  account_number: string;
  account_name: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  company_name: string;
  contact_person: string;
  contact_info: ContactInfo;
  bank_info?: BankInfo;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  rating: number;
  total_orders: number;
  on_time_delivery_rate: number;
  quality_score: number;
  categories: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PerformanceMetric {
  supplier_id?: string;
  order_id: string;
  delivery_time_actual: string;
  delivery_time_expected: string;
  delivery_status: 'on_time' | 'delayed' | 'early';
  quality_rating: number;
  comments?: string;
  recorded_at?: string;
}

export interface PerformanceScore {
  supplier_id: string;
  overall_score: number;
  on_time_score: number;
  quality_score: number;
  total_orders: number;
  on_time_orders: number;
  average_quality_rating: number;
  last_updated: string;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'supplier_manager' | 'viewer';
  permissions?: string[];
  is_active?: boolean;
  created_at?: string;
}

export interface ApiError {
  detail: string;
  status?: number;
}