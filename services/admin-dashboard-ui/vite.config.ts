import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3014,
    proxy: {
      '/api': {
        target: 'http://localhost:3013',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:3013',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:3013',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})
