import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base:'/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,  // allow access from external devices
    port: 5173,
  },
})
