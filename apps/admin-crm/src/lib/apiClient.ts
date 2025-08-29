// API Client for Admin CRM
import { supabase } from './supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
    };
  }

  async get(endpoint: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers
    });
    return response.json();
  }

  async post(endpoint: string, data: any) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async put(endpoint: string, data: any) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    return response.json();
  }

  // PPS API endpoints
  async getPPSRankings(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/pps/rankings?${queryString}`);
  }

  async getProviderPPS(providerId: string) {
    return this.get(`/api/pps/provider/${providerId}`);
  }

  async calculatePPS(params: any = {}) {
    return this.post('/api/pps/calculate', params);
  }

  // Provider endpoints
  async getProviders() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        providers!inner(*),
        provider_performance_metrics(*)
      `)
      .eq('role', 'provider');
    
    if (error) throw error;
    return { data };
  }

  // Booking endpoints
  async getBookings(params: any = {}) {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        user_profiles!bookings_customer_id_fkey(full_name, email),
        providers(user_profiles!providers_id_fkey(full_name)),
        services(name),
        user_addresses(street_address, city, state)
      `);

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.date) {
      query = query.gte('scheduled_start_time', `${params.date}T00:00:00`)
                   .lt('scheduled_start_time', `${params.date}T23:59:59`);
    }

    const { data, error } = await query.order('scheduled_start_time', { ascending: false });
    
    if (error) throw error;
    return { data };
  }

  // Dashboard stats
  async getDashboardStats() {
    try {
      // Get today's bookings
      const today = new Date().toISOString().split('T')[0];
      const todaysBookings = await this.getBookings({ date: today });
      
      // Get all providers
      const providers = await this.getProviders();
      
      // Get recent bookings for revenue calculation
      const recentBookings = await this.getBookings();
      
      // Calculate stats
      const totalRevenue = recentBookings.data?.reduce((sum: number, booking: any) => 
        sum + (booking.final_cost || booking.estimated_cost || 0), 0) || 0;
      
      const activeProviders = providers.data?.filter((p: any) => 
        p.providers?.onboarding_status === 'active').length || 0;
      
      const avgPPSScore = providers.data?.reduce((sum: number, p: any, _, arr: any[]) => {
        const score = p.provider_performance_metrics?.[0]?.current_pps_score || 0;
        return sum + score / arr.length;
      }, 0) || 0;

      return {
        data: {
          todaysBookings: todaysBookings.data?.length || 0,
          totalRevenue,
          activeProviders,
          avgPPSScore: Math.round(avgPPSScore * 10) / 10,
          pendingApprovals: providers.data?.filter((p: any) => 
            p.providers?.onboarding_status === 'documents_submitted').length || 0
        }
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return {
        data: {
          todaysBookings: 0,
          totalRevenue: 0,
          activeProviders: 0,
          avgPPSScore: 0,
          pendingApprovals: 0
        }
      };
    }
  }

  // Health check
  async healthCheck() {
    try {
      return await this.get('/api/health');
    } catch (error) {
      return { success: false, message: 'API unavailable' };
    }
  }
}

export const apiClient = new ApiClient();