import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages publica em https://duduwwl.github.io/clinica-vivaz/
// Para domínio próprio, defina VITE_BASE=/ no build.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/clinica-vivaz/',
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('node_modules/motion') || id.includes('framer-motion')) return 'motion'
          if (id.includes('node_modules/react')) return 'react'
        },
      },
    },
  },
  test: {
    environment: 'node',
  },
} as never)
