import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'
import jsconfigPaths from 'vite-jsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), eslint(), jsconfigPaths()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-contentful': ['contentful', '@contentful/live-preview'],
          'vendor-markdown': ['react-markdown'],
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
})
