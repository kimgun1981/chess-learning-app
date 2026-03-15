import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // ngrok 및 모든 외부 호스트 접속 허용
    allowedHosts: true,
    host: true
  }
})
