import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { mpTestSyncPlugin } from './vite/mpTestSyncPlugin'

export default defineConfig({
  plugins: [react(), tailwindcss(), mpTestSyncPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/miscuentas/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          'react-query': ['@tanstack/react-query'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
