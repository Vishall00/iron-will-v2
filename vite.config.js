import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensures assets use relative paths for Electron / Capacitor local file:// protocols
  base: './'
})
