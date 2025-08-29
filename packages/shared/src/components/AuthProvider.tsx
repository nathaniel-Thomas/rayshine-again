import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthState } from '../api/auth';
import { websocketClient } from '../api/websocket';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData?: any) => Promise<any>;
  signOut: () => Promise<any>;
  updateProfile: (updates: any) => Promise<any>;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state);
      
      // Connect to WebSocket when authenticated
      if (state.session && state.user) {
        websocketClient.connect(state.session.access_token, {
          onConnect: () => console.log('🔌 WebSocket connected'),
          onDisconnect: () => console.log('❌ WebSocket disconnected'),
          onError: (error) => console.error('🔌 WebSocket error:', error)
        });
      } else {
        websocketClient.disconnect();
      }
    });

    return unsubscribe;
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    signIn: authService.signIn.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService),
    updateProfile: authService.updateProfile.bind(authService),
    isAuthenticated: authService.isAuthenticated(),
    hasRole: authService.hasRole.bind(authService),
    hasAnyRole: authService.hasAnyRole.bind(authService),
    getAccessToken: authService.getAccessToken.bind(authService)
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;