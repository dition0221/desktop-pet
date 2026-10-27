import { resolve as resolvePath } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

const resolve = { tsconfigPaths: true }

export default defineConfig({
  main: { resolve },
  preload: { resolve },
  renderer: {
    resolve,
    plugins: [
      tanstackRouter({
        target: 'react',
        routesDirectory: resolvePath('src/renderer/mainWindow/routes'),
        generatedRouteTree: resolvePath('src/renderer/mainWindow/routeTree.gen.ts')
      }),
      react(),
      tailwindcss()
    ],
    build: {
      rolldownOptions: {
        input: {
          index: resolvePath('src/renderer/index.html'),
          overlay: resolvePath('src/renderer/overlay.html')
        }
      }
    }
  }
})
