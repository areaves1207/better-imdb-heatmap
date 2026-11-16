import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Builds the Chrome extension popup from extension/ into dist-extension/.
// It reuses the site's components from src/ and reads the Supabase URL/key from .env.
export default defineConfig({
  root: path.resolve(import.meta.dirname, 'extension'),
  // extension files are loaded from chrome-extension://<id>/, so asset paths must be relative
  base: './',
  envDir: import.meta.dirname,
  plugins: [react()],
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist-extension'),
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(import.meta.dirname, 'extension', 'popup.html') },
  },
})
