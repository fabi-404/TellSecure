import { createClient } from '@supabase/supabase-js';

// Use the provided Supabase URL or fallback
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://itkacigajvkjcbbubtdn.supabase.co';

// Use the specific public key provided
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_j77c1yiYkeaPrszvj2TZwA_DKDmo2X1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);