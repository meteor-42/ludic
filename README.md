# Инструкция по развертыванию на AlmaLinux

## 1) Клонирование и сборка фронтенда

```bash
# Установка необходимых пакетов
sudo dnf update -y
sudo dnf install -y git curl unzip rsync

# Клонирование репозитория
git clone https://github.com/meteor-42/ludic.git
cd ludic

# Установка bun
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Добавляем bun в PATH постоянно
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc

# Зависимости и сборка
bun install
bun run build
# Получите статические файлы в ./dist
```

Опционально: если вы собираете на другом хосте — просто передайте содержимое папки `dist` на сервер в целевую директорию (см. раздел "Статика фронта").

## 2) Установка и запуск PocketBase как systemd-сервиса

Версию и платформу подберите под свой сервер: https://github.com/pocketbase/pocketbase/releases

```bash
# Папки для PB
sudo mkdir -p /var/www/ludic/pb

# Если хотите использовать уже имеющуюся базу из репозитория
sudo rsync -av --delete ./pb/pb_data/ /var/www/ludic/pb/pb_data/

# Скачиваем бинарник (пример для linux_amd64)
cd /var/www/ludic/pb
sudo curl -L -o pb.zip \
  https://github.com/pocketbase/pocketbase/releases/download/v0.22.18/pocketbase_0.22.18_linux_amd64.zip
sudo unzip -o pb.zip
sudo rm -f pb.zip

# Создаём systemd unit
sudo bash -c 'cat > /etc/systemd/system/pocketbase.service << EOF
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/ludic/pb
ExecStart=/var/www/ludic/pb/pocketbase serve --http=0.0.0.0:8090 --dir /var/www/ludic/pb/pb_data
Restart=always

[Install]
WantedBy=multi-user.target
EOF'

# Запуск и автозапуск
sudo systemctl daemon-reload
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
sudo systemctl status pocketbase --no-pager
```

Проверка API локально на сервере:
```bash
curl -s http://127.0.0.1:8090/api/health
# {"message":"API is healthy.","code":200,"data":{}}
```

## 3) Статика фронта

Скопируйте собранную статику в директорию, которую будет раздавать Nginx:

```bash
sudo mkdir -p /var/www/ludic/site
sudo rsync -av --delete ./dist/ /var/www/ludic/site/
```

Обновление фронта в будущем: повторно выполните `bun run build` и `rsync` только содержимое `dist` в `/var/www/ludic/site/`.

## 4) Установка Nginx и конфигурация (TLS + статика + прокси API/WS)

```bash
# Установка Nginx
sudo dnf install -y nginx

# Запуск и автозагрузка Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Замените пути к сертификатам на свои (Let's Encrypt показан как пример). Домен: `xn--d1aigb4b.xn--p1ai`.

**Важно:** В AlmaLinux конфигурационные файлы Nginx размещаются в `/etc/nginx/conf.d/`, а не в `sites-available/sites-enabled`.

```nginx
# /etc/nginx/conf.d/ludic.conf
server {
    listen 80;
    server_name xn--d1aigb4b.xn--p1ai www.xn--d1aigb4b.xn--p1ai;
    return 301 https://xn--d1aigb4b.xn--p1ai$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name xn--d1aigb4b.xn--p1ai;

    ssl_certificate     /etc/letsencrypt/live/xn--d1aigb4b.xn--p1ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xn--d1aigb4b.xn--p1ai/privkey.pem;

    root /var/www/ludic/site;
    index index.html;

    # Статические ассеты
    location /assets/ {
        try_files $uri =404;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API -> PocketBase
    location /api/ {
        proxy_pass         http://127.0.0.1:8090/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection "";
        proxy_read_timeout 60s;
    }

    # WebSocket -> PocketBase (раскомментируйте при необходимости)
    #location /pb_ws {
    #    proxy_pass         http://127.0.0.1:8090/pb_ws/;
    #    proxy_http_version 1.1;
    #    proxy_set_header   Upgrade $http_upgrade;
    #    proxy_set_header   Connection "upgrade";
    #    proxy_set_header   Host $host;
    #    proxy_set_header   X-Real-IP $remote_addr;
    #    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    #    proxy_set_header   X-Forwarded-Proto $scheme;
    #}

    # SPA fallback
    location / {
        try_files $uri /index.html;
    }
}
```

Проверка конфигурации и перезагрузка Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5) Настройка firewalld и SELinux

AlmaLinux использует firewalld и SELinux по умолчанию:

```bash
# Открываем порты HTTP и HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Проверка открытых портов
sudo firewall-cmd --list-all

# Разрешаем Nginx подключаться к сети (для проксирования на PocketBase)
sudo setsebool -P httpd_can_network_connect 1

# Если используете нестандартный порт для PocketBase:
# sudo semanage port -a -t http_port_t -p tcp 8090
```

## 6) Установка Let's Encrypt сертификатов

```bash
# Установка certbot
sudo dnf install -y epel-release
sudo dnf install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d xn--d1aigb4b.xn--p1ai -d www.xn--d1aigb4b.xn--p1ai

# Автопродление сертификатов (уже настроено через systemd timer)
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

# Проверка автопродления
sudo certbot renew --dry-run
```

## 7) Проверка развертывания

Проверка извне:
```bash
curl -I https://xn--d1aigb4b.xn--p1ai/
curl -s https://xn--d1aigb4b.xn--p1ai/api/health
```

Проверка локально на сервере:
```bash
# PocketBase напрямую
curl -s http://127.0.0.1:8090/api/health

# Nginx статус
sudo systemctl status nginx --no-pager

# PocketBase статус
sudo systemctl status pocketbase --no-pager
```

## 8) Важные замечания для AlmaLinux

- Фронтенд уже настроен на единый базовый путь API `/api`. Nginx проксирует их на PocketBase, поэтому дополнительных правок в коде не требуется.
- Не нужен Node/Express/PM2 в продакшене — меньше процессов и точек отказа.
- SELinux включен по умолчанию и может блокировать Nginx. Убедитесь, что выполнили команду `setsebool -P httpd_can_network_connect 1`.
- Firewalld активен по умолчанию — не забудьте открыть порты 80 и 443.
- В AlmaLinux нет директорий `sites-available` и `sites-enabled` для Nginx. Все конфигурации размещаются в `/etc/nginx/conf.d/`.

---

# Production Checks (Nginx + PocketBase)

Используйте эти команды для проверки развертывания на xn--d1aigb4b.xn--p1ai (лудик.рф).

Учетные данные для тестирования авторизации:
- identity: alisa.palmieri@ya.ru
- password: bet

## 1) Проверка здоровья системы

- API proxy → PocketBase health
```bash
curl -i https://xn--d1aigb4b.xn--p1ai/api/health
```

Ожидаемый результат: HTTP/1.1 200 и JSON статус ok.

## 2) Статика и безопасность

- Статические ассеты (должны быть 200 с заголовками кеша)
```bash
curl -I https://xn--d1aigb4b.xn--p1ai/assets/index-XYZ.js
```

- Dotfiles должны быть заблокированы (должно быть 404)
```bash
curl -i https://xn--d1aigb4b.xn--p1ai/.env
```

## 3) CORS и preflight

- Preflight для POST с кастомными заголовками
```bash
curl -i -X OPTIONS https://xn--d1aigb4b.xn--p1ai/api/collections/users/auth-with-password \
  -H "Origin: https://xn--d1aigb4b.xn--p1ai" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
```

Ожидаемый результат: 204 No Content, присутствуют заголовки Access-Control-Allow-*.

## 4) Авторизация (PocketBase)

- Авторизация по паролю
```bash
curl -i -X POST https://xn--d1aigb4b.xn--p1ai/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"alisa.palmieri@ya.ru","password":"bet"}'
```

- Авторизованный запрос с Bearer токеном (замените PB_TOKEN на токен из ответа login)
```bash
curl -i https://xn--d1aigb4b.xn--p1ai/api/collections/bets/records \
  -H "Authorization: Bearer PB_TOKEN"
```

- Авторизованный запрос с cookie
```bash
curl -i https://xn--d1aigb4b.xn--p1ai/api/collections/bets/records \
  -H "Cookie: pb_auth=PB_COOKIE"
```

## 5) Диагностика производительности

- Подробный вывод с разбивкой по времени
```bash
curl -v -w "\nDNS:%{time_namelookup} TCP:%{time_connect} TLS:%{time_appconnect} TTFB:%{time_starttransfer} TOTAL:%{time_total}\n" \
  -o /dev/null https://xn--d1aigb4b.xn--p1ai/api/health
```

- Проверка PocketBase напрямую с сервера (SSH на хост)
```bash
curl -i http://127.0.0.1:8090/api/health
```

## 6) Проверка WebSocket

- Проверка путь upgrade заголовков WS (не открывает реальное WS соединение)
```bash
curl -i -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://xn--d1aigb4b.xn--p1ai/pb_ws
```

## 7) Устранение неполадок

- Проверка и перезагрузка Nginx (на сервере)
```bash
sudo nginx -t && sudo systemctl reload nginx
```

- Логи (на сервере)
```bash
sudo journalctl -u nginx -f
sudo journalctl -u pocketbase -f
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

- Firewall (AlmaLinux)
```bash
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

- SELinux (разрешить проксирование)
```bash
sudo setsebool -P httpd_can_network_connect 1
# Проверка статуса SELinux
sudo getenforce
# Проверка логов SELinux
sudo ausearch -m avc -ts recent
```

- Проверка статуса служб
```bash
sudo systemctl status nginx --no-pager
sudo systemctl status pocketbase --no-pager
```

## 8) Полезные команды для AlmaLinux

- Просмотр открытых портов
```bash
sudo ss -tulpn | grep -E ':(80|443|8090)'
```

- Перезапуск всех служб
```bash
sudo systemctl restart pocketbase
sudo systemctl restart nginx
```

- Проверка используемой памяти
```bash
sudo systemctl status pocketbase --no-pager | grep Memory
free -h
```
