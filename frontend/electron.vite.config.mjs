import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin()
    ],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts')
        },
        output: {
          format: 'cjs',
          preserveModules: true,
          exports: 'auto'
        }
      }
    }
  },
  preload: {
    plugins: [
      externalizeDepsPlugin(),
    ],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts')
        },
        output: {
          format: 'cjs',
          preserveModules: true,
          exports: 'auto'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    root: resolve('src/renderer'),
    server: {
      proxy: {
        '/media': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: 'out/renderer'
    },
    plugins: [react()]
  }
})