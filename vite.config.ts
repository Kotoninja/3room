import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: { include: ['onnxruntime-web/wasm'] },
  worker: { format: 'es' },
  plugins: [react(), tailwindcss()],
})
