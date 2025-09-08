import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/', // critical for Netlify
  plugins: [react()],
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  }
  // optional local dev niceties:
  // server: { host: true, port: 5173 }
})