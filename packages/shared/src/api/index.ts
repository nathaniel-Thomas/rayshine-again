// Export all API utilities
export { default as apiClient, type ApiResponse, type PaginatedResponse } from './client';
export { default as websocketClient, type WebSocketCallbacks } from './websocket';
export { API_CONFIG } from './config';

// Export all service classes and types
export {
  BookingService,
  ProviderService,
  ServiceApiService,
  PPSService,
  JobAssignmentService,
  SystemService,
  type User,
  type Provider,
  type Service,
  type ServiceCategory,
  type Booking,
  type PPSResult,
  type JobAssignment
} from './services';

// Auth utilities
export * from './auth';

// React hooks (if using React)
export * from './hooks';