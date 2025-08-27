import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

// Mock user data for demo
const mockUser: User = {
  id: '1',
  email: 'sam@example.com',
  firstName: 'Sam',
  lastName: 'Wilson',
  avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
  rating: 4.8,
  isOnline: true,
  phone: '(555) 123-4567',
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      signIn: async (credentials) => {
        set({ isLoading: true, error: null });
        
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        if (credentials.email === 'sam@example.com' && credentials.password === 'password') {
          set({ 
            user: mockUser, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } else {
          set({ 
            error: 'Invalid email or password', 
            isLoading: false 
          });
        }
      },
      signOut: () => {
        set({ 
          user: null, 
          isAuthenticated: false, 
          error: null 
        });
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);