import React from 'react';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: string;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRole,
  requiredRoles,
  fallback,
  redirectTo
}: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, hasAnyRole, loading, user } = useAuth();

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    if (redirectTo) {
      window.location.href = redirectTo;
      return null;
    }
    
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
        <p className="text-gray-600 mb-4">Please sign in to access this page.</p>
        <button
          onClick={() => window.location.href = '/auth/signin'}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You don't have the required permissions to access this page.
        </p>
        <p className="text-sm text-gray-500">
          Required role: {requiredRole} | Your role: {user?.role || 'None'}
        </p>
      </div>
    );
  }

  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You don't have the required permissions to access this page.
        </p>
        <p className="text-sm text-gray-500">
          Required roles: {requiredRoles.join(', ')} | Your role: {user?.role || 'None'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;