import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Privileged operations (creating admins, resetting resident passwords, etc.)
// run server-side in Supabase Edge Functions instead of here — the service
// role / secret key must never be shipped to the browser.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);