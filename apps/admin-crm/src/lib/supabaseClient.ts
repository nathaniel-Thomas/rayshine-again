import { createClient } from '@supabase/supabase-js'

// Get the environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://taztbuzcoirlmynqczqo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhenRidXpjb2lybG15bnFjenFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMjE5OTEsImV4cCI6MjA3MDg5Nzk5MX0.gqyFTTCIdoWHd36hatvB5X3p_-Ax73FOlra0Fl9oabI'

// Warn if using fallbacks
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('Missing Supabase environment variables, using fallbacks')
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)