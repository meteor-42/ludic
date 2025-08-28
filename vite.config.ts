import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Проксируем API запросы к PocketBase
      '/api': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true,
        secure: false,
        // Не удаляем /api префикс, так как PocketBase ожидает его
      }
    }
  }
});
