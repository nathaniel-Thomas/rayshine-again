// Environment configuration that works in both browser and Node.js environments
function getEnvVar(name: string): string {
  if (typeof window !== 'undefined') {
    // Browser environment - use import.meta.env
    return (import.meta as any)?.env?.[name] || '';
  } else {
    // Node.js environment - use process.env
    return process.env[name] || '';
  }
}

export const config = {
  api: {
    baseUrl: getEnvVar('VITE_API_URL') || 'http://localhost:8000',
    wsUrl: getEnvVar('VITE_WS_URL') || 'ws://localhost:8000'
  },
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL') || 'https://taztbuzcoirlmynqczqo.supabase.co',
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhenRidXpjb2lybG15bnFjenFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMjE5OTEsImV4cCI6MjA3MDg5Nzk5MX0.gqyFTTCIdoWHd36hatvB5X3p_-Ax73FOlra0Fl9oabI'
  }
};