import { apiClient, ApiResponse, PaginatedResponse } from './client';
import { API_CONFIG } from './config';

// Types
export interface User {
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

export interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
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

export interface PPSResult {
  provider_id: string;
  pps_score: number;
  distance_score: number;
  performance_score: number;
  reliability_score: number;
  consistency_score: number;
  availability_score: number;
  distance_miles?: number;
  rank: number;
}

export interface JobAssignment {
  id: number;
  booking_id: number;
  provider_id: string;
  assigned_at: string;
  expires_at: string;
  pps_score_at_assignment: number;
  assignment_order: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'no_response' | 'scheduled' | 'cancelled';
  responded_at?: string;
  response_time_seconds?: number;
  created_at: string;
  updated_at: string;
}

// API Services
export class BookingService {
  static async createBooking(bookingData: {
    service_id: number;
    scheduled_start_time: string;
    scheduled_end_time: string;
    address_id: number;
    customer_notes?: string;
    add_on_ids?: number[];
  }): Promise<ApiResponse<Booking>> {
    return apiClient.post(API_CONFIG.ENDPOINTS.BOOKINGS, bookingData);
  }

  static async getBookings(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<Booking>> {
    return apiClient.getPaginated(API_CONFIG.ENDPOINTS.BOOKINGS, params);
  }

  static async getBookingById(id: number): Promise<ApiResponse<Booking>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(id));
  }

  static async updateBookingStatus(id: number, status: string): Promise<ApiResponse<Booking>> {
    return apiClient.patch(API_CONFIG.ENDPOINTS.BOOKING_STATUS(id), { status });
  }
}

export class ProviderService {
  static async searchProviders(params?: {
    service_id?: number;
    location?: string;
    radius?: number;
    min_rating?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Provider>> {
    return apiClient.getPaginated(API_CONFIG.ENDPOINTS.PROVIDER_SEARCH, params);
  }

  static async getProviderById(id: string): Promise<ApiResponse<Provider>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.PROVIDER_BY_ID(id));
  }

  static async updateProviderProfile(data: {
    bio?: string;
    hourly_rate?: number;
  }): Promise<ApiResponse<Provider>> {
    return apiClient.put(API_CONFIG.ENDPOINTS.PROVIDER_PROFILE, data);
  }

  static async getProviderBookings(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<Booking>> {
    return apiClient.getPaginated(API_CONFIG.ENDPOINTS.PROVIDER_BOOKINGS, params);
  }
}

export class ServiceApiService {
  static async getServices(categoryId?: number): Promise<ApiResponse<Service[]>> {
    const params = categoryId ? { category_id: categoryId } : undefined;
    return apiClient.get(API_CONFIG.ENDPOINTS.SERVICES, { params });
  }

  static async getServiceCategories(): Promise<ApiResponse<ServiceCategory[]>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.SERVICE_CATEGORIES);
  }

  static async getServiceById(id: number): Promise<ApiResponse<Service>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.SERVICE_BY_ID(id));
  }
}

export class PPSService {
  static async calculatePPS(params: {
    provider_id?: string;
    job_latitude?: number;
    job_longitude?: number;
    service_area_filter?: boolean;
    limit?: number;
  }): Promise<ApiResponse<PPSResult | PPSResult[]>> {
    return apiClient.post(API_CONFIG.ENDPOINTS.PPS_CALCULATE, params);
  }

  static async getProviderPPSScore(providerId: string): Promise<ApiResponse<PPSResult>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.PPS_PROVIDER(providerId));
  }

  static async getProviderRankings(params?: {
    job_latitude?: number;
    job_longitude?: number;
    service_area_filter?: boolean;
    limit?: number;
  }): Promise<ApiResponse<PPSResult[]>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.PPS_RANKINGS, { params });
  }

  static async getMyPPSScore(): Promise<ApiResponse<PPSResult>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.PPS_MY_SCORE);
  }
}

export class JobAssignmentService {
  static async assignJob(data: {
    booking_id: number;
    assignment_method: 'manual' | 'auto_pps';
    manual_provider_id?: string;
    max_providers?: number;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(API_CONFIG.ENDPOINTS.JOB_ASSIGNMENT_ASSIGN, data);
  }

  static async respondToJobAssignment(
    assignmentId: number,
    response: 'accept' | 'decline',
    declineReason?: string
  ): Promise<ApiResponse<any>> {
    return apiClient.post(API_CONFIG.ENDPOINTS.JOB_ASSIGNMENT_RESPOND(assignmentId), {
      response,
      decline_reason: declineReason
    });
  }

  static async getJobAssignments(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<JobAssignment>> {
    return apiClient.getPaginated(API_CONFIG.ENDPOINTS.JOB_ASSIGNMENTS, params);
  }

  static async getJobAssignmentById(id: number): Promise<ApiResponse<JobAssignment>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.JOB_ASSIGNMENT_BY_ID(id));
  }

  static async getMyPendingAssignments(): Promise<PaginatedResponse<JobAssignment>> {
    return apiClient.getPaginated(API_CONFIG.ENDPOINTS.MY_PENDING_ASSIGNMENTS);
  }
}

export class SystemService {
  static async getHealth(): Promise<ApiResponse<any>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.HEALTH);
  }

  static async processExpiredAssignments(): Promise<ApiResponse<any>> {
    return apiClient.post(`${API_CONFIG.ENDPOINTS.EXPIRED_ASSIGNMENTS}/process`);
  }
}