import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/dashboard': 'http://localhost:8000',
      '/nav': 'http://localhost:8000',
      '/physics': 'http://localhost:8000',
      '/action': 'http://localhost:8000',
      '/goal': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    }
  }
})
