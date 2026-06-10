import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' kvôli GitHub Pages (appka beží v podpriečinku /woodworking-manager-web/)
export default defineConfig({
  plugins: [react()],
  base: './',
})
