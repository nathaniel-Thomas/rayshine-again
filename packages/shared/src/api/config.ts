import { config } from '../config/environment';

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com/api'
    : `${config.api.baseUrl}/api`,
  
  WEBSOCKET_URL: process.env.NODE_ENV === 'production'
    ? 'wss://your-production-domain.com'
    : config.api.wsUrl,
    
  TIMEOUT: 30000, // 30 seconds
  
  ENDPOINTS: {
    // Auth
    AUTH: '/auth',
    
    // Bookings
    BOOKINGS: '/bookings',
    BOOKING_BY_ID: (id: number) => `/bookings/${id}`,
    BOOKING_STATUS: (id: number) => `/bookings/${id}/status`,
    
    // Providers
    PROVIDERS: '/providers',
    PROVIDER_SEARCH: '/providers/search',
    PROVIDER_BY_ID: (id: string) => `/providers/${id}`,
    PROVIDER_PROFILE: '/providers/profile',
    PROVIDER_BOOKINGS: '/providers/me/bookings',
    
    // Services
    SERVICES: '/services',
    SERVICE_CATEGORIES: '/services/categories',
    SERVICE_BY_ID: (id: number) => `/services/${id}`,
    
    // PPS System
    PPS_CALCULATE: '/pps/calculate',
    PPS_PROVIDER: (id: string) => `/pps/provider/${id}`,
    PPS_RANKINGS: '/pps/rankings',
    PPS_MY_SCORE: '/pps/my-score',
    
    // Job Assignment
    JOB_ASSIGNMENTS: '/job-assignments',
    JOB_ASSIGNMENT_BY_ID: (id: number) => `/job-assignments/${id}`,
    JOB_ASSIGNMENT_RESPOND: (id: number) => `/job-assignments/${id}/respond`,
    JOB_ASSIGNMENT_ASSIGN: '/job-assignments/assign',
    MY_PENDING_ASSIGNMENTS: '/job-assignments/my-assignments/pending',
    
    // System
    HEALTH: '/health',
    EXPIRED_ASSIGNMENTS: '/expired-assignments',
  }
};

export default API_CONFIG;