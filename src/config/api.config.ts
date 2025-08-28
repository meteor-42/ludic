// API Configuration
// В production используем относительные пути через Nginx proxy
// В development используем Vite proxy

const isDevelopment = import.meta.env.MODE === 'development';

// В production Nginx проксирует /api/* запросы на PocketBase
// PocketBase SDK НЕ добавляет /api автоматически, поэтому нужно указать явно
// Используем window.location.origin для правильной работы на любом домене
export const API_URL = typeof window !== 'undefined'
  ? window.location.origin
  : '';

export default {
  API_URL
};
