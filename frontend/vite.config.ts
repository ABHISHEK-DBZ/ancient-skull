import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Keep the browser Origin/Host so the backend can derive the OAuth
        // callback that matches the registered localhost:5173 URI.
        target: 'http://127.0.0.1:8000',
        changeOrigin: false
      }
    }
  }
})
