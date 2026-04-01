// delivery.types.ts

export enum OrderSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large'
}

export enum VehicleType {
  BIKE = 'bike',
  MOTORCYCLE = 'motorcycle',
  CAR = 'car',
  VAN = 'van',
  TRUCK = 'truck'
}

export enum DeliveryStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum DriverStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  BUSY = 'busy',
  ON_BREAK = 'on_break'
}

// Add the missing DeliveryType enum
export enum DeliveryType {
  HOTEL = 'hotel',
  CUSTOMER = 'customer'
}

export interface HotelInfo {
  hotel_id: string;
  hotel_name: string;
  hotel_cono: string;
  address: string;
  phone: string;
  email?: string;
  latitude?: number;
  longitude?: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  email?: string;
  latitude?: number;
  longitude?: number;
}

export interface StockItem {
  item_id: string;
  item_name: string;
  quantity: number;
  weight_kg: number;
  unit_price: number;
  total_price: number;
}

export interface TrackingEvent {
  status: DeliveryStatus;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
  };
  notes?: string;
  driver_name?: string;
}

export interface DeliveryOrder {
  order_id?: string;
  hotel_info: HotelInfo;
  customer_info: CustomerInfo;
  items: StockItem[];
  order_size: OrderSize;
  vehicle_type?: VehicleType;
  status?: DeliveryStatus;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  assigned_driver?: string;
  assigned_driver_name?: string;
  driver_phone?: string;
  distance_km?: number;
  total_weight_kg?: number;
  total_value?: number;
  delivery_cost?: number;
  created_at?: string;
  updated_at?: string;
  tracking_history?: TrackingEvent[];
  delivery_type?: DeliveryType; // Now using the enum instead of string literal
  delivery_notes?: string;
  signature_required?: boolean;
  proof_of_delivery?: string;
  customer_signature?: string;
  current_location?: {
    lat: number;
    lng: number;
    timestamp?: string;
  };
}

export interface DeliveryUpdate {
  status: DeliveryStatus;
  location?: {
    lat: number;
    lng: number;
  };
  notes?: string;
  proof_of_delivery?: string;
}

// Extended interface for dashboard with additional properties
export interface ExtendedDeliveryOrder extends DeliveryOrder {
  current_location?: {
    lat: number;
    lng: number;
  };
  hotel_info: HotelInfo;
  customer_info: CustomerInfo;
  status: DeliveryStatus;
  estimated_delivery_time?: string;
  distance_km?: number;
  vehicle_type?: VehicleType;
  assigned_driver_name?: string;
  items: StockItem[];
  total_weight_kg?: number;
}

// Add the missing VehicleRequirement interface
export interface VehicleRequirement {
  order_size: OrderSize;
  recommended_vehicle: VehicleType;
  max_distance_km: number;
  max_weight_kg: number;
  min_weight_kg: number;
  description: string;
  base_cost: number;
  cost_per_km: number;
}

// Add Driver interface if missing
export interface Driver {
  driver_id?: string;
  name: string;
  phone: string;
  email?: string;
  vehicle_type: VehicleType;
  vehicle_number: string;
  status: DriverStatus;
  current_location?: {
    lat: number;
    lng: number;
  };
  current_order_id?: string;
  total_deliveries_today: number;
  total_deliveries_total: number;
  rating: number;
  joined_date?: string;
  last_active?: string;
}

// Add DeliveryStatistics interface if missing
export interface DeliveryStatistics {
  total_deliveries: number;
  status_breakdown: Record<string, number>;
  average_delivery_time_minutes: number;
  total_distance_km: number;
  on_time_delivery_rate: number;
  average_driver_rating: number;
  total_revenue: number;
  deliveries_by_vehicle: Record<string, number>;
  peak_hours: number[];
}