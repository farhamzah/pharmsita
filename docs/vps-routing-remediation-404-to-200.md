# VPS Routing Remediation Action Plan from 404 to 200

Task: 200
Date: 2026-07-01 Asia/Jakarta
Domain: http://pharmsita.safaubp.com
Baseline artifact: pharmsita-task199-e849c50
Priority: Extra High
Status: READY FOR OPERATOR REMEDIATION

## Current Problem

The public domain is reachable but returns Nginx 404:

```text
HTTP/1.1 404 Not Found
Server: nginx/1.22.1
```

Affected URLs:

- `http://pharmsita.safaubp.com`
- `http://pharmsita.safaubp.com/api/v1/health`
- `http://pharmsita.safaubp.com/api/v1/health/ready`

This means DNS and Nginx are alive, but the active Nginx routing is not serving the PharmSITA
frontend and is not proxying `/api/v1` to the backend.

## Remediation Goal

Reach these results:

| URL | Required Result |
| --- | --- |
| `http://pharmsita.safaubp.com` | HTTP 200 and frontend HTML |
| `http://pharmsita.safaubp.com/#/login` | HTTP 200 and frontend app shell |
| `http://pharmsita.safaubp.com/api/v1/health` | HTTP 200 and JSON `status=ok` |
| `http://pharmsita.safaubp.com/api/v1/health/ready` | HTTP 200 readiness JSON or reviewed staging warning |

## Fast Diagnosis Decision Tree

### A. Root 404 and API 404

Most likely cause:

- Nginx is not using the PharmSITA server block for `pharmsita.safaubp.com`;
- default site is capturing the domain;
- `pharmsita.conf` was not copied/reloaded;
- `/var/www/pharmsita/current` is missing or points to a wrong release.

Fix first:

1. active Nginx config;
2. release symlink;
3. frontend file path.

### B. Root 200 but API 404

Most likely cause:

- Nginx frontend root is correct, but `/api/v1` proxy location is missing or not active.

Fix first:

1. `location ^~ /api/v1/`;
2. `proxy_pass http://pharmsita_backend`;
3. active `upstream pharmsita_backend`.

### C. Root 200 but API 502/504

Most likely cause:

- backend service is down;
- backend is not listening on `127.0.0.1:4000`;
- production env guard failed;
- PostgreSQL connection failed at startup.

Fix first:

1. `systemctl status pharmsita-backend`;
2. `ss -ltnp | grep ':4000'`;
3. backend journal/logs;
4. `/etc/pharmsita/backend.env`.

### D. Health 200 but Ready Degraded/Fail

Most likely cause:

- PostgreSQL migration/readiness issue.

Fix first:

1. `DATABASE_URL` validity;
2. `npm run db:migrate:status`;
3. migration apply if backup gate permits.

## Operator Remediation Commands

Run on VPS.

### 1. Confirm Active Release

```bash
readlink -f /var/www/pharmsita/current
ls -la /var/www/pharmsita/current
ls -la /var/www/pharmsita/current/dist/index.html
ls -la /var/www/pharmsita/current/backend/dist/server.js
ls -la /var/www/pharmsita/current/deploy/vps/nginx/pharmsita.safaubp.com-http.conf.example
```

If any file is missing, stop and re-extract the clean release artifact.

### 2. Confirm Backend Can Start

```bash
cd /var/www/pharmsita/current
npm run backend:check-production-env
sudo systemctl daemon-reload
sudo systemctl restart pharmsita-backend
sudo systemctl status pharmsita-backend --no-pager
sudo journalctl -u pharmsita-backend -n 100 --no-pager
```

Check internal backend port:

```bash
ss -ltnp | grep ':4000' || sudo lsof -iTCP:4000 -sTCP:LISTEN
curl -sS http://127.0.0.1:4000/api/v1/health
curl -sS http://127.0.0.1:4000/api/v1/health/ready
```

If internal health fails, fix backend/env/database before continuing to Nginx.

### 3. Inspect Active Nginx Config

```bash
sudo nginx -T | grep -n "server_name pharmsita.safaubp.com" -C 8
sudo nginx -T | grep -n "/var/www/pharmsita/current/dist" -C 5
sudo nginx -T | grep -n "location .*api/v1" -C 8
sudo nginx -T | grep -n "127.0.0.1:4000" -C 5
```

If these are missing, Nginx is not using the PharmSITA config.

### 4. Disable Conflicting Default Site if Needed

Only do this if the default site is capturing `pharmsita.safaubp.com`.

```bash
sudo ls -la /etc/nginx/sites-enabled
sudo grep -R "server_name" /etc/nginx/sites-enabled /etc/nginx/conf.d
```

If the default site is active and unnecessary:

```bash
sudo mv /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.disabled 2>/dev/null || true
```

If the server uses `/etc/nginx/conf.d/default.conf`, back it up instead of deleting:

```bash
sudo mkdir -p /etc/nginx/conf.d/backup-pharmsita
sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/backup-pharmsita/default.conf.$(date +%Y%m%d%H%M%S) 2>/dev/null || true
```

### 5. Apply PharmSITA HTTP Config

```bash
sudo mkdir -p /etc/nginx/conf.d/backup-pharmsita
sudo cp -a /etc/nginx/conf.d/pharmsita.conf /etc/nginx/conf.d/backup-pharmsita/pharmsita.conf.$(date +%Y%m%d%H%M%S) 2>/dev/null || true
sudo cp /var/www/pharmsita/current/deploy/vps/nginx/pharmsita.safaubp.com-http.conf.example /etc/nginx/conf.d/pharmsita.conf
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
```

If `nginx -t` fails with duplicate `map`, `log_format`, or `upstream`, another PharmSITA config is
still active. Disable the old duplicate config, then rerun `sudo nginx -t`.

### 6. Verify Public Routing

Run from VPS and from local machine:

```bash
curl -I http://pharmsita.safaubp.com
curl -sS http://pharmsita.safaubp.com | head
curl -I http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health/ready
```

Expected:

- root HTTP 200;
- root body shows frontend app shell;
- health HTTP 200 with `status=ok`;
- readiness returns ready or a reviewed staging warning.

### 7. Run Live Dry-Run

```bash
cd /var/www/pharmsita/current
npm run deploy:vps:dry-run -- \
  --api-base-url http://pharmsita.safaubp.com/api/v1 \
  --frontend-url http://pharmsita.safaubp.com \
  --allow-http \
  --allow-degraded-readiness
```

## Remediation Evidence to Return

Return sanitized output for:

```text
readlink -f /var/www/pharmsita/current
ls -la /var/www/pharmsita/current/dist/index.html
ls -la /var/www/pharmsita/current/backend/dist/server.js
npm run backend:check-production-env
sudo systemctl status pharmsita-backend --no-pager
ss -ltnp | grep ':4000'
curl -sS http://127.0.0.1:4000/api/v1/health
sudo nginx -t
sudo nginx -T | grep -n "server_name pharmsita.safaubp.com" -C 8
sudo systemctl status nginx --no-pager
curl -I http://pharmsita.safaubp.com
curl -sS http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health/ready
npm run deploy:vps:dry-run -- --api-base-url http://pharmsita.safaubp.com/api/v1 --frontend-url http://pharmsita.safaubp.com --allow-http --allow-degraded-readiness
```

Do not return passwords, tokens, `AUTH_SECRET`, or full `DATABASE_URL`.

## GO/BLOCKED Rule

Routing is GO for controlled UAT when:

- root returns HTTP 200;
- `/api/v1/health` returns HTTP 200 and `status=ok`;
- backend service is active;
- backend listens on port 4000;
- Nginx active config contains `server_name pharmsita.safaubp.com`;
- Nginx active config points root to `/var/www/pharmsita/current/dist`;
- Nginx active config proxies `/api/v1` to `127.0.0.1:4000`;
- live deployment dry-run passes.

Routing remains BLOCKED when:

- root or `/api/v1/health` remains 404;
- backend is not active;
- port 4000 is not listening;
- Nginx config does not include the PharmSITA server block;
- readiness fails due to unresolved database/migration issue.

## HTTPS Follow-Up

After HTTP routing reaches 200 and controlled UAT smoke is accepted:

```bash
sudo certbot --nginx -d pharmsita.safaubp.com
sudo nginx -t
sudo systemctl reload nginx
sudo sed -i 's#CORS_ORIGIN=http://pharmsita.safaubp.com#CORS_ORIGIN=https://pharmsita.safaubp.com#' /etc/pharmsita/backend.env
sudo systemctl restart pharmsita-backend
```

Then rerun the same health checks with `https://`.
