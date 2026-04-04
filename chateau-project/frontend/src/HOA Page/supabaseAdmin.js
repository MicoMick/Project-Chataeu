import { createClient } from '@supabase/supabase-js';

// These lines grab the URL and Key from your .env file automatically
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This creates the "bridge" and exports it so other files can use it
export const supabase = createClient(supabaseUrl, supabaseAnonKey);