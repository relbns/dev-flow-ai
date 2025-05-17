// Completely replace the file with this content
// This will prevent any imports from the old supabaseClient

// src/lib/supabaseClient.js
// This is now just a wrapper that redirects to apiClient
import { supabase as apiSupabase } from './apiClient';

// Export apiClient's supabase interface
export const supabase = apiSupabase;

// If anyone imports createClient, throw an error to prevent Supabase usage
export const createClient = () => {
  console.error('DEPRECATED: Direct Supabase usage is deprecated. Please use apiClient instead.');
  throw new Error('Direct Supabase usage is deprecated. Please use apiClient instead.');
};
