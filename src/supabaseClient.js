import { createClient } from '@supabase/supabase-js'

// Pull values safely from Vite env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)


