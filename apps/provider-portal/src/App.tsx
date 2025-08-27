import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { SignInPage } from '@/pages/SignInPage';
import { DashboardTab } from '@/pages/DashboardTab';
import { ScheduleTab } from '@/pages/ScheduleTab';
import { JobsTab } from '@/pages/JobsTab';
import { EarningsTab } from '@/pages/EarningsTab';
import { ProfileTab } from '@/pages/ProfileTab';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function AppContent() {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show loading spinner during authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mx-auto">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">RayShine Provider Portal</h2>
            <p className="text-gray-600">Signing you in...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in page if not authenticated
  if (!isAuthenticated) {
    return <SignInPage />;
  }

  // Main app layout with navigation
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="min-h-screen">
        <Routes>
          <Route path="/dashboard" element={<DashboardTab />} />
          <Route path="/schedule" element={<ScheduleTab />} />
          <Route path="/jobs" element={<JobsTab />} />
          <Route path="/earnings" element={<EarningsTab />} />
          <Route path="/profile" element={<ProfileTab />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;