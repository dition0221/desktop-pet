import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

const resolve = { tsconfigPaths: true }

export default defineConfig({
  main: { resolve },
  preload: { resolve },
  renderer: {
    resolve,
    plugins: [react(), tailwindcss()]
  }
})
