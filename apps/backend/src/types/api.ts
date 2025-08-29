export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateBookingRequest {
  service_id: number;
  scheduled_start_time: string;
  scheduled_end_time: string;
  address_id: number;
  customer_notes?: string;
  add_on_ids?: number[];
}

export interface UpdateBookingStatusRequest {
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
}

export interface CreateQuoteRequest {
  booking_id: number;
  quoted_amount: number;
  expires_at: string;
}

export interface CreateReviewRequest {
  booking_id: number;
  reviewee_id: string;
  rating: number;
  comment?: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
}

export interface UpdateProviderRequest {
  bio?: string;
  hourly_rate?: number;
}

export interface CreateAddressRequest {
  address_label: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country_code?: string;
  is_primary?: boolean;
}

export interface SearchProvidersQuery extends PaginationQuery {
  service_id?: number;
  location?: string;
  radius?: number;
  min_rating?: number;
  availability_start?: string;
  availability_end?: string;
}