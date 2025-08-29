// Export all types
export * from './types';

// Export all schemas
export * from './schemas';

// Export mock data
export * from './mock-data';

// Export API utilities (selective to avoid conflicts)
export { apiClient, websocketClient, API_CONFIG } from './api';
export { 
  BookingService,
  ProviderService,
  ServiceApiService,
  PPSService,
  JobAssignmentService,
  SystemService
} from './api';

// Export auth utilities
export { authService, supabase } from './api/auth';
export type { AuthUser, AuthState } from './api/auth';

// Export React hooks (selective to avoid conflicts)
export { 
  useApiData, 
  usePaginatedData, 
  useProviderAssignments
} from './api/hooks';

// Export components
export * from './components';
