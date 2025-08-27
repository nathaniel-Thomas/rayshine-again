import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';
import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { BookingPage } from '@/pages/booking/BookingPage';
import { AccountDashboard } from '@/pages/dashboard/AccountDashboard';
import '@/styles/globals.css';
import { useAuthStore } from './stores/auth'; // Import the auth store
import { useEffect } from 'react'; // Import useEffect

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // This logic checks for an active session when the app starts
  const { initialize } = useAuthStore();
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/dashboard" element={<AccountDashboard />} />
            <Route path="/services/:category" element={<div>Services Page</div>} />
            <Route path="/how-it-works" element={<div>How It Works Page</div>} />
            <Route path="/about" element={<div>About Page</div>} />
            <Route path="/profile" element={<div>Profile Page</div>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </QueryClientProvider>
  );
}

export default App;