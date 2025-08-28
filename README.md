# DOC.md

Простой продакшн-сетап без Node/Express/PM2: Nginx раздаёт статический фронтенд, а PocketBase обслуживает API. Nginx проксирует /api и /pb_ws в PocketBase. Это минимально и надёжно.

## 1) Клонирование и сборка фронтенда

```bash
git clone https://github.com/meteor-42/ludic.git
cd ludic

# Установка bun
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

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
sudo apt-get update && sudo apt-get install -y unzip || true
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
{"message":"API is healthy.","code":200,"data":{}}
```

## 3) Статика фронта

Скопируйте собранную статику в директорию, которую будет раздавать Nginx:

```bash
sudo mkdir -p /var/www/ludic/site
sudo rsync -av --delete ./dist/ /var/www/ludic/site/
```

Обновление фронта в будущем: повторно выполните `bun run build` и `rsync` только содержимое `dist` в `/var/www/ludic/site/`.

## 4) Конфиг Nginx (TLS + статика + прокси API/WS)

Замените пути к сертификатам на свои (Let’s Encrypt показан как пример). Домен: `xn--d1aigb4b.xn--p1ai`.

```nginx
# /etc/nginx/sites-available/ludic.conf
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

    # WebSocket -> PocketBase
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

Активация сайта и перезагрузка Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/ludic.conf /etc/nginx/sites-enabled/ludic.conf || true
sudo nginx -t
sudo systemctl reload nginx
```

Проверка извне:
```bash
curl -I https://xn--d1aigb4b.xn--p1ai/
curl -s https://xn--d1aigb4b.xn--p1ai/api/health
```

## 5) Важные замечания

- Фронтенд уже настроен на единый базовый путь API `/api`. Nginx проксирует их на PocketBase, поэтому дополнительных правок в коде не требуется.
- Не нужен Node/Express/PM2 в продакшене — меньше процессов и точек отказа.
- Если у вас SELinux/ufw/firewalld, откройте нужные порты (443/80 локально, 8090 только для localhost). Пример для ufw:
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  ```
- Для автопродления сертификатов Let’s Encrypt используйте certbot timer/unit (обычно ставится автоматически).

# Production Checks (Nginx + Express + PocketBase)

Use these commands to validate your deployment for xn--d1aigb4b.xn--p1ai (лудик.рф).

Credentials for auth test:
- identity: alisa.palmieri@ya.ru
- password: bet

## 1) Basic health

- Express health
```
curl -i https://xn--d1aigb4b.xn--p1ai/health
```

- API proxy → PocketBase health
```
curl -i https://xn--d1aigb4b.xn--p1ai/api/health
```

Expected: HTTP/1.1 200 and JSON status ok.

## 2) Static and security

- Static asset (should be 200 with cache headers)
```
curl -I https://xn--d1aigb4b.xn--p1ai/assets/index-XYZ.js
```

- Dotfiles must be blocked (should be 404)
```
curl -i https://xn--d1aigb4b.xn--p1ai/.env
```

## 3) CORS and preflight

- Preflight for POST with custom headers
```
curl -i -X OPTIONS https://xn--d1aigb4b.xn--p1ai/api/collections/users/auth-with-password -H "Origin: https://xn--d1aigb4b.xn--p1ai" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type,authorization"
```

Expected: 204 No Content, Access-Control-Allow-* headers present.

## 4) Auth (PocketBase)

- Password auth
```
curl -i -X POST https://xn--d1aigb4b.xn--p1ai/api/collections/users/auth-with-password -H "Content-Type: application/json" -d '{"identity":"alisa.palmieri@ya.ru","password":"deface"}'
```

- Authorized request with Bearer token (replace PB_TOKEN from login response)
```
curl -i https://xn--d1aigb4b.xn--p1ai/api/collections/bets/records \
  -H "Authorization: Bearer PB_TOKEN"
```

- Authorized request with cookie
```
curl -i https://xn--d1aigb4b.xn--p1ai/api/collections/bets/records \
  -H "Cookie: pb_auth=PB_COOKIE"
```

Expected: 404/502, but certainly not a valid API response.

## 6) Performance diagnostics

- Verbose + timing breakdown
```
curl -v -w "\nDNS:%{time_namelookup} TCP:%{time_connect} TLS:%{time_appconnect} TTFB:%{time_starttransfer} TOTAL:%{time_total}\n" -o /dev/null https://xn--d1aigb4b.xn--p1ai/api/health
```

- Check PocketBase directly from server (SSH into host where Express runs)
```
curl -i http://127.0.0.1:8090/api/health
```

## 7) WebSocket probe

- Validate WS upgrade headers path (does not open a real WS)
```
curl -i -H "Connection: Upgrade" -H "Upgrade: websocket"  https://xn--d1aigb4b.xn--p1ai/pb_ws
```

## 8) Troubleshooting

- Nginx test and reload (on server)
```
sudo nginx -t && sudo systemctl reload nginx
```

- Logs (on server)
```
sudo journalctl -u nginx -f
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

- Firewall (CentOS)
```
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --add-service=https --permanent
sudo firewall-cmd --reload
```

- SELinux (allow proxying)
```
sudo setsebool -P httpd_can_network_connect 1
```

