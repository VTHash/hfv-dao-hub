// src/supabaseClient.js
// Use local package in dev, CDN in production (Netlify)
const isProd = import.meta.env.PROD

// Dynamically choose the module URL
const modUrl = isProd
  ? 'https://esm.sh/@supabase/supabase-js@2.57.2' // ESM CDN for builds
  : '@supabase/supabase-js' // local node_modules for dev

const { createClient } = await import(modUrl)

// Vite env names
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)