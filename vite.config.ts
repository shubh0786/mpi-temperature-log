import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/mpi-temperature-log/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})