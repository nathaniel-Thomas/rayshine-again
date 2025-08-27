import { createClient } from '@supabase/supabase-js'

// Get the environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Throw an error if the variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be defined in your .env file")
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)