import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://backend:8000',
      '/health': 'http://backend:8000',
    },
  },
  // In production build, the static site uses rewrites (render.yaml)
  // to proxy /api/* and /health to the backend service
}))
