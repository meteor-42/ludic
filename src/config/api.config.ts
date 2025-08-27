// API Configuration
// В production используем относительные пути через Express proxy
// В development используем Vite proxy

const isDevelopment = import.meta.env.MODE === 'development';

// В production все запросы идут через Express сервер с префиксом /api
// В development Vite проксирует на локальный PocketBase
export const API_URL = isDevelopment
  ? 'http://localhost:8090' // Для разработки с Vite proxy
  : '/api'; // В production через Express proxy

export const WS_URL = isDevelopment
  ? 'ws://localhost:8090'
  : '/pb_ws';

export default {
  API_URL,
  WS_URL
};
