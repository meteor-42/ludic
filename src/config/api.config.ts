// API Configuration
// В production используем относительные пути через Express proxy
// В development используем Vite proxy

const isDevelopment = import.meta.env.MODE === 'development';

// Оба прокси (Vite и Express) убирают префикс /api при проксировании на PocketBase
// Поэтому всегда используем /api как базовый URL
export const API_URL = '/api'; // Единый URL для всех режимов

// WebSocket URL также унифицирован
export const WS_URL = '/pb_ws';

export default {
  API_URL,
  WS_URL
};
