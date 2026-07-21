import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Serve under /ve/ on GitHub Pages, / everywhere else
  base: process.env.GITHUB_PAGES ? '/ve/' : '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
