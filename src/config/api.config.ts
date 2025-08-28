// API Configuration
// В production используем относительные пути через Nginx proxy
// В development используем Vite proxy

const isDevelopment = import.meta.env.MODE === 'development';

// PocketBase SDK автоматически добавляет /api к базовому URL
// Поэтому мы должны использовать пустой путь или корень
// Nginx будет проксировать /api/* запросы на PocketBase
export const API_URL = ''; // Пустой URL, так как SDK добавит /api сам

// WebSocket URL
export const WS_URL = '/pb_ws';

export default {
  API_URL,
  WS_URL
};
