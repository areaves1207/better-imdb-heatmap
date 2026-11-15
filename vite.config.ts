import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set by the deploy workflow to "/<repo-name>/" for GitHub Pages project sites
  base: process.env.BASE_PATH ?? '/',
})
