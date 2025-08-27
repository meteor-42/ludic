#!/bin/bash

# Скрипт установки зависимостей для Express сервера

echo "📦 Установка зависимостей для Express сервера..."

# Переходим в директорию сервера
cd "$(dirname "$0")"

# Установка зависимостей
npm install

echo "✅ Зависимости установлены!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Скопируйте ../.env.example в ../.env и настройте переменные"
echo "2. Соберите фронтенд: cd .. && npm run build && mv dist server/out"
echo "3. Запустите сервер: npm start"
echo ""
echo "Для запуска через PM2:"
echo "pm2 start server.js --name ludic-server"
