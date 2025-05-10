import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL not found. Did you forget to create an .env file with VITE_SUPABASE_URL?");
}
if (!supabaseAnonKey) {
  throw new Error("Supabase Anon Key not found. Did you forget to create an .env file with VITE_SUPABASE_ANON_KEY?");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
