import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabaseClient' // Import our real Supabase client
import type { User as AuthUser } from '@supabase/supabase-js' // Use Supabase's User type

// A helper type for our user profile data
type UserProfile = {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface AuthState {
  user: (AuthUser & { profile: UserProfile }) | null
  isAuthenticated: boolean
  isLoading: boolean
  initialize: () => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start in a loading state

      // This new function checks for an active session when the app loads
      initialize: () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            const userProfile: UserProfile = {
              first_name: session.user.user_metadata.first_name || null,
              last_name: session.user.user_metadata.last_name || null,
              avatar_url: session.user.user_metadata.avatar_url || null,
            };
            
            const userWithProfile = {
              ...session.user,
              profile: userProfile,
            };

            set({ user: userWithProfile, isAuthenticated: true, isLoading: false })
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false })
          }
        })

        // Unsubscribe from the listener when it's no longer needed
        return () => subscription.unsubscribe()
      },

      logout: async () => {
        set({ isLoading: true })
        await supabase.auth.signOut()
        set({ user: null, isAuthenticated: false, isLoading: false })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
)