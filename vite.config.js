import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  build: {
    rollupOptions: {
      input: ['index.html', 'login.html'].map((file) => fileURLToPath(new URL(file, import.meta.url))),
    },
  },
})
