import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        boys: resolve(__dirname, 'boys.html'),
        girls: resolve(__dirname, 'girls.html'),
        contact: resolve(__dirname, 'contact.html'),
        admin: resolve(__dirname, 'admin.html'),
        privasy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
      }
    }
  }
})
