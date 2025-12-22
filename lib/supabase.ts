import { createClient } from '@supabase/supabase-js';

// Use the provided Supabase URL or fallback, checking Next.js env vars first
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://itkacigajvkjcbbubtdn.supabase.co';

// Use the specific public key provided, checking Next.js env vars first
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_j77c1yiYkeaPrszvj2TZwA_DKDmo2X1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);