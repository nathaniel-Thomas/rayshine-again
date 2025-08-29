import { useState, useEffect, useCallback } from 'react';
import { authService, AuthState } from './auth';
import { websocketClient, WebSocketCallbacks } from './websocket';
import { apiClient, ApiResponse, PaginatedResponse } from './client';

// Auth hooks
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return authService.signIn(email, password);
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    userData?: {
      username?: string;
      full_name?: string;
      phone_number?: string;
      role?: 'customer' | 'provider';
    }
  ) => {
    return authService.signUp(email, password, userData);
  }, []);

  const signOut = useCallback(async () => {
    return authService.signOut();
  }, []);

  const updateProfile = useCallback(async (updates: {
    username?: string;
    full_name?: string;
    phone_number?: string;
    avatar_url?: string;
  }) => {
    return authService.updateProfile(updates);
  }, []);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated: authService.isAuthenticated(),
    hasRole: authService.hasRole.bind(authService),
    hasAnyRole: authService.hasAnyRole.bind(authService)
  };
}

// WebSocket hook
export function useWebSocket(callbacks: WebSocketCallbacks = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const { user, session } = useAuth();

  useEffect(() => {
    if (session && user) {
      const token = session.access_token;
      
      websocketClient.connect(token, {
        ...callbacks,
        onConnect: () => {
          setIsConnected(true);
          callbacks.onConnect?.();
        },
        onDisconnect: () => {
          setIsConnected(false);
          callbacks.onDisconnect?.();
        }
      });
    }

    return () => {
      websocketClient.disconnect();
      setIsConnected(false);
    };
  }, [session, user]);

  return {
    isConnected,
    respondToJobAssignment: websocketClient.respondToJobAssignment.bind(websocketClient),
    updateBookingStatus: websocketClient.updateBookingStatus.bind(websocketClient),
    sendChatMessage: websocketClient.sendChatMessage.bind(websocketClient),
    updateProviderLocation: websocketClient.updateProviderLocation.bind(websocketClient),
    disconnect: websocketClient.disconnect.bind(websocketClient)
  };
}

// API data fetching hook
export function useApiData<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetcher();
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    refetch();
  }, dependencies);

  return { data, loading, error, refetch };
}

// Paginated data hook
export function usePaginatedData<T>(
  fetcher: (params: { page: number; limit: number }) => Promise<PaginatedResponse<T>>,
  initialLimit: number = 10
) {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (page: number, limit: number = pagination.limit) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetcher({ page, limit });
      
      if (response.data) {
        setData(response.data);
        setPagination(response.pagination);
      } else {
        setError('No data received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      fetchPage(pagination.page + 1);
    }
  }, [pagination.page, pagination.totalPages, fetchPage]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      fetchPage(pagination.page - 1);
    }
  }, [pagination.page, fetchPage]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchPage(page);
    }
  }, [pagination.totalPages, fetchPage]);

  useEffect(() => {
    fetchPage(1);
  }, []);

  return {
    data,
    pagination,
    loading,
    error,
    nextPage,
    prevPage,
    goToPage,
    refetch: () => fetchPage(pagination.page)
  };
}

// Provider-specific hooks
export function useProviderAssignments() {
  const { user } = useAuth();
  
  return usePaginatedData(
    useCallback(
      (params) => apiClient.getPaginated('/job-assignments/my-assignments/pending', params),
      []
    )
  );
}

// Job assignment response hook for providers
export function useJobAssignmentResponse() {
  const [responding, setResponding] = useState(false);

  const respond = useCallback(async (
    assignmentId: number,
    response: 'accept' | 'decline',
    declineReason?: string
  ) => {
    setResponding(true);
    
    try {
      const result = await apiClient.post(`/job-assignments/${assignmentId}/respond`, {
        response,
        decline_reason: declineReason
      });
      
      return result;
    } finally {
      setResponding(false);
    }
  }, []);

  return { respond, responding };
}

// Booking management hook
export function useBookingManagement() {
  const [loading, setLoading] = useState(false);

  const updateStatus = useCallback(async (bookingId: number, status: string) => {
    setLoading(true);
    
    try {
      const result = await apiClient.patch(`/bookings/${bookingId}/status`, { status });
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const createBooking = useCallback(async (bookingData: {
    service_id: number;
    scheduled_start_time: string;
    scheduled_end_time: string;
    address_id: number;
    customer_notes?: string;
    add_on_ids?: number[];
  }) => {
    setLoading(true);
    
    try {
      const result = await apiClient.post('/bookings', bookingData);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateStatus, createBooking, loading };
}