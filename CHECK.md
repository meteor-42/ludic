# Production Checks (Nginx + Express + PocketBase)

Use these commands to validate your deployment. Replace your.domain.com, USER, PASS, and tokens.

## 1) Basic health

- Express health
```
curl -i http://your.domain.com/health
```

- API proxy → PocketBase health
```
curl -i http://your.domain.com/api/health
```

Expected: HTTP/1.1 200 and JSON status ok.

## 2) Static and security

- Static asset (should be 200 with cache headers)
```
curl -I http://your.domain.com/assets/index-XYZ.js
```

- Dotfiles must be blocked (should be 404)
```
curl -i http://your.domain.com/.env
```

## 3) CORS and preflight

- Preflight for POST with custom headers
```
curl -i -X OPTIONS http://your.domain.com/api/collections/users/auth-with-password \
  -H "Origin: https://your.domain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
```

Expected: 204 No Content, Access-Control-Allow-* headers present.

## 4) Auth (PocketBase)

- Password auth
```
curl -i -X POST http://your.domain.com/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"USER","password":"PASS"}'
```

- Pretty output (requires jq locally)
```
curl -sS -X POST http://your.domain.com/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"USER","password":"PASS"}' | jq
```

- Authorized request with Bearer token
```
curl -i http://your.domain.com/api/collections/bets/records \
  -H "Authorization: Bearer PB_TOKEN"
```

- Authorized request with cookie
```
curl -i http://your.domain.com/api/collections/bets/records \
  -H "Cookie: pb_auth=PB_COOKIE"
```

## 5) No double /api

- This must NOT work; ensures no accidental /api/api
```
curl -i http://your.domain.com/api/api/collections/users/auth-with-password
```

Expected: 404/502, but certainly not a valid API response.

## 6) Performance diagnostics

- Verbose + timing breakdown
```
curl -v -w "\nDNS:%{time_namelookup} TCP:%{time_connect} TLS:%{time_appconnect} TTFB:%{time_starttransfer} TOTAL:%{time_total}\n" \
  -o /dev/null http://your.domain.com/api/health
```

- Check PocketBase directly from server (SSH into host where Express runs)
```
curl -i http://127.0.0.1:8090/api/health
```

## 7) WebSocket probe

- Validate WS upgrade headers path (does not open a real WS)
```
curl -i -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://your.domain.com/pb_ws
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
