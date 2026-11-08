import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './', // Asegura rutas relativas para despliegues estáticos
  publicDir: 'public', // Vite buscará en src/renderer/public por defecto si no se especifica, pero mejor ser explícitos o dejar el default
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@': resolve(__dirname, 'src/renderer/src')
    }
  },
  css: {
    postcss: resolve(__dirname, 'postcss.config.js')
  },
  server: {
    proxy: {
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [react()]
})
