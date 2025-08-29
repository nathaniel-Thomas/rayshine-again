export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  phone_number?: string;
  role: 'customer' | 'provider' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  bio?: string;
  onboarding_status: 'started' | 'documents_submitted' | 'verified' | 'active';
  is_verified: boolean;
  hourly_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  base_price: number;
  is_variable_pricing: boolean;
  estimated_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  customer_id: string;
  provider_id?: string;
  service_id: number;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  address_id: number;
  customer_notes?: string;
  estimated_cost?: number;
  final_cost?: number;
  created_at: string;
  updated_at: string;
}

export interface UserAddress {
  id: number;
  user_id: string;
  address_label: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  location?: any; // PostGIS GEOGRAPHY type
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  booking_id?: number;
  user_id: string;
  type: 'charge' | 'refund' | 'payout' | 'platform_fee';
  amount: number;
  currency: string;
  gateway_transaction_id?: string;
  status: 'succeeded' | 'failed' | 'pending';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingQuote {
  id: number;
  booking_id: number;
  provider_id: string;
  quoted_amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  booking_id: number;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  thread_id: number;
  sender_id: string;
  content: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'booking_alert' | 'system' | 'payment' | 'review';
  is_read: boolean;
  created_at: string;
  updated_at: string;
}