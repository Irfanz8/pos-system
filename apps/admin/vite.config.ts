import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

export default defineConfig({
  base: '/admin/',
  plugins: [react(), TanStackRouterVite()],
  server: {
    port: 5173,
  },
})
