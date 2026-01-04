import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Handle missing environment variables gracefully
// If vars are missing, we create a client with dummy values so the app doesn't crash on startup.
// API calls will fail, but the app allows falling back to mock data.
const isConfigured = supabaseUrl && supabaseAnonKey;

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');

// Helper to check configuration
export const isSupabaseConfigured = () => !!isConfigured;
