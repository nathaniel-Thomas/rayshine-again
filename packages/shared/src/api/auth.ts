import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { apiClient } from './client';
import { config } from '../config/environment';

// Initialize Supabase client
const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
  role?: 'customer' | 'provider' | 'admin';
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

class AuthService {
  private listeners: Set<(state: AuthState) => void> = new Set();
  private state: AuthState = {
    user: null,
    session: null,
    loading: true,
    initialized: false
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      }

      if (session) {
        await this.setSession(session);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (session) {
          await this.setSession(session);
        } else {
          this.clearSession();
        }
      });

      this.state.initialized = true;
      this.state.loading = false;
      this.notifyListeners();
    } catch (error) {
      console.error('Error initializing auth:', error);
      this.state.loading = false;
      this.state.initialized = true;
      this.notifyListeners();
    }
  }

  private async setSession(session: Session) {
    this.state.session = session;
    
    // Set token in API client
    apiClient.setToken(session.access_token);

    // Fetch user profile
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
      }

      this.state.user = {
        id: session.user.id,
        email: session.user.email,
        username: profile?.username,
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        phone_number: profile?.phone_number,
        role: profile?.role || 'customer'
      };
    } catch (error) {
      console.error('Error setting session:', error);
      this.state.user = {
        id: session.user.id,
        email: session.user.email
      };
    }

    this.state.loading = false;
    this.notifyListeners();
  }

  private clearSession() {
    this.state.session = null;
    this.state.user = null;
    this.state.loading = false;
    
    // Clear token from API client
    apiClient.clearToken();
    
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  // Public methods
  public getState(): AuthState {
    return { ...this.state };
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async signUp(email: string, password: string, userData?: {
    username?: string;
    full_name?: string;
    phone_number?: string;
    role?: 'customer' | 'provider';
  }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      // Create user profile if signup successful
      if (data.user && userData) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            username: userData.username || email.split('@')[0],
            full_name: userData.full_name || '',
            phone_number: userData.phone_number,
            role: userData.role || 'customer'
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  public async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  public async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  }

  public async resetPassword(email: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  public async updateProfile(updates: {
    username?: string;
    full_name?: string;
    phone_number?: string;
    avatar_url?: string;
  }) {
    if (!this.state.user) {
      throw new Error('Not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', this.state.user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      this.state.user = { ...this.state.user, ...updates };
      this.notifyListeners();

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  public async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  public isAuthenticated(): boolean {
    return !!this.state.session && !!this.state.user;
  }

  public hasRole(role: string): boolean {
    return this.state.user?.role === role;
  }

  public hasAnyRole(roles: string[]): boolean {
    return !!this.state.user?.role && roles.includes(this.state.user.role);
  }

  public getAccessToken(): string | null {
    return this.state.session?.access_token || null;
  }
}

// Create singleton instance
export const authService = new AuthService();
export default authService;