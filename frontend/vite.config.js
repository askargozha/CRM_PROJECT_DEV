import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // В Docker на Windows изменения файлов не долетают до контейнера
    // без опроса — включается в docker-compose.dev.yml (VITE_POLLING).
    watch: { usePolling: process.env.VITE_POLLING === 'true' },
  },
})
