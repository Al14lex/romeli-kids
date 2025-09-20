
import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/',    
  publicDir: resolve(__dirname, 'public'),             
  server: { port: 5173 },    
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index:   resolve(__dirname, 'index.html'),
        boys:    resolve(__dirname, 'boys.html'),
        girls:   resolve(__dirname, 'girls.html'),
        contact: resolve(__dirname, 'contact.html'),
        about:   resolve(__dirname, 'about.html'),
        admin:   resolve(__dirname, 'admin.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms:   resolve(__dirname, 'terms.html'),
      }
    }
  }
})
