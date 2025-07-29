import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'test.ncatechsolutions.org',
      'localhost',
      '127.0.0.1',
      '0.0.0.0'
    ],
    proxy: {
      '/api': {
        target: 'http://backend:8080',
        changeOrigin: true,
        secure: false,
      },
      '/swagger': {
        target: 'http://backend:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})