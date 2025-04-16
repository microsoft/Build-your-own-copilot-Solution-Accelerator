import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '..', '.env') });

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../static',
    emptyOutDir: true,
    sourcemap: true
  },
  server: {
    proxy: {
      '/ask': 'http://localhost:5000',
      '/chat': 'http://localhost:5000'
    }
  },
  define: {
    'process.env': process.env
  }
})
