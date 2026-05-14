// client/vite.config.js
// Vite dev server proxy /api → backend.
//
// Khi chạy local:   target = http://localhost:4000  (mặc định)
// Khi chạy Docker:  VITE_API_TARGET = http://server:4000 (Docker service name)
//
// Proxy giúp browser thấy mọi request là same-origin:
//   - Cookie HttpOnly + SameSite=Lax hoạt động đúng
//   - Không cần bật CORS credentials phức tạp

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,          // bind 0.0.0.0 → cần thiết khi chạy trong Docker container
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
