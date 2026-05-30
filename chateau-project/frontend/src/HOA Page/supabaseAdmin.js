import { createClient } from '@supabase/supabase-js';

// 1. Grab your URLs and Keys from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ADD THIS: Put your secret key directly here for local capstone testing
const supabaseServiceKey = 'sb_secret_L-4nccYQr4q3L08y2mrgBA_qaIfGPtO'; 

// 2. Your standard, safe client (Keeps all your existing code working perfectly!)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 3. Your new "God Mode" client 
// ONLY import and use this when you specifically need to bypass security (like changing passwords)
export const supabaseAdminAuth = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});