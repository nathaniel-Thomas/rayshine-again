export interface PPSMetrics {
  provider_id: string;
  jobs_completed: number;
  jobs_offered: number;
  jobs_accepted: number;
  jobs_declined: number;
  jobs_no_response: number;
  on_time_arrivals: number;
  late_arrivals: number;
  last_minute_cancellations: number;
  total_distance_traveled: number;
  total_earnings: number;
  current_pps_score: number;
  distance_score: number;
  performance_score: number;
  reliability_score: number;
  consistency_score: number;
  availability_score: number;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
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
  notification_sent_at?: string;
  notification_delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCoverage {
  id: number;
  provider_id: string;
  coverage_type: 'radius' | 'zip_codes' | 'polygon';
  center_latitude?: number;
  center_longitude?: number;
  max_radius_miles?: number;
  zip_codes?: string[];
  coverage_polygon?: any; // PostGIS GEOGRAPHY type
  preferred_max_distance_miles: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PerformanceHistory {
  id: number;
  provider_id: string;
  booking_id: number;
  distance_miles?: number;
  was_on_time: boolean;
  was_completed: boolean;
  customer_rating?: number;
  was_cancelled_last_minute: boolean;
  was_no_show: boolean;
  response_time_minutes?: number;
  actual_start_time?: string;
  scheduled_start_time?: string;
  decay_weight: number;
  created_at: string;
  updated_at: string;
}

export interface PPSCalculationRequest {
  provider_id?: string;
  job_latitude?: number;
  job_longitude?: number;
  service_area_filter?: boolean;
  limit?: number;
}

export interface PPSResponse {
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

export interface JobAssignmentResponse {
  success: boolean;
  assignment_id?: number;
  provider_id?: string;
  expires_at?: string;
  message: string;
  booking_confirmed?: boolean;
  next_provider_notified?: boolean;
}