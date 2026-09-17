import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'build' },
  server: {
    proxy: {
      '/api': process.env.COOKMATE_API_PROXY || 'http://localhost:8080',
      '/uploads': process.env.COOKMATE_API_PROXY || 'http://localhost:8080',
    },
  },
})
