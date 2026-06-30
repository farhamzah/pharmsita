# Operator Apply Nginx HTTP Config and Live Routing Verification

Task: 194
Date: 2026-07-01 Asia/Jakarta
Domain: http://pharmsita.safaubp.com
Release artifact baseline: pharmsita-task193-66da60e
Status: BLOCKED - WAITING FOR VPS OPERATOR APPLY

## Objective

Apply the temporary HTTP Nginx config for `pharmsita.safaubp.com`, make sure the PharmSITA backend
service is running, then verify that the live domain serves the frontend and proxies `/api/v1`.

This task is an operator action on the VPS. Local verification can only confirm the current public
HTTP result.

## Current Public Check

Checked from local machine:

| URL | Expected | Current |
| --- | --- | --- |
| `http://pharmsita.safaubp.com` | HTTP 200 frontend HTML | HTTP 404 Nginx |
| `http://pharmsita.safaubp.com/api/v1/health` | HTTP 200 JSON `status=ok` | HTTP 404 Nginx |
| `http://pharmsita.safaubp.com/api/v1/health/ready` | HTTP 200 readiness JSON | HTTP 404 Nginx |

Conclusion: DNS and Nginx are reachable, but the domain is not routed to PharmSITA yet.

## Preconditions on VPS

Operator must confirm:

- release artifact `pharmsita-task193-66da60e` has been uploaded and extracted;
- `/var/www/pharmsita/current` points to the extracted release;
- `/var/www/pharmsita/current/dist/index.html` exists;
- `/var/www/pharmsita/current/backend/dist/server.js` exists;
- `/etc/pharmsita/backend.env` exists and contains production/staging values;
- PostgreSQL database is reachable from the VPS.

## Apply Commands

Run on VPS as the deployment operator.

### 1. Verify Release Files

```bash
ls -la /var/www/pharmsita/releases
readlink -f /var/www/pharmsita/current
ls -la /var/www/pharmsita/current/dist/index.html
ls -la /var/www/pharmsita/current/backend/dist/server.js
ls -la /var/www/pharmsita/current/deploy/vps/nginx/pharmsita.safaubp.com-http.conf.example
```

### 2. Verify Backend Env

```bash
sudo test -f /etc/pharmsita/backend.env
sudo grep -E '^(NODE_ENV|PORT|API_PREFIX|CORS_ORIGIN|DB_ADAPTER|DATABASE_SSL)=' /etc/pharmsita/backend.env
```

Required values for temporary HTTP UAT:

```env
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1
CORS_ORIGIN=http://pharmsita.safaubp.com
DB_ADAPTER=postgres
```

Do not print `DATABASE_URL` or `AUTH_SECRET` into shared evidence.

### 3. Restart Backend

```bash
cd /var/www/pharmsita/current
npm run backend:check-production-env
sudo systemctl daemon-reload
sudo systemctl enable pharmsita-backend
sudo systemctl restart pharmsita-backend
sudo systemctl status pharmsita-backend --no-pager
sudo journalctl -u pharmsita-backend -n 80 --no-pager
```

Expected:

- production env guard passes;
- service is `active (running)`;
- no database/auth secret/startup guard error.

### 4. Apply Nginx HTTP Config

Back up current config first:

```bash
sudo mkdir -p /etc/nginx/conf.d/backup-pharmsita
sudo cp -a /etc/nginx/conf.d/pharmsita.conf /etc/nginx/conf.d/backup-pharmsita/pharmsita.conf.$(date +%Y%m%d%H%M%S) 2>/dev/null || true
```

Install temporary HTTP config:

```bash
sudo cp /var/www/pharmsita/current/deploy/vps/nginx/pharmsita.safaubp.com-http.conf.example /etc/nginx/conf.d/pharmsita.conf
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
```

If `nginx -t` reports duplicate `map`, `log_format`, or `upstream`, disable the old PharmSITA config
or duplicate default site before reload.

### 5. Verify From VPS

```bash
curl -I http://pharmsita.safaubp.com
curl -sS http://pharmsita.safaubp.com | head
curl -I http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health/ready
```

Expected:

- frontend root returns HTTP 200;
- frontend HTML contains Vite/React app root;
- `/api/v1/health` returns HTTP 200 and `status=ok`;
- `/api/v1/health/ready` returns readiness response.

### 6. Verify With Deployment Dry-Run

```bash
cd /var/www/pharmsita/current
npm run deploy:vps:dry-run -- \
  --api-base-url http://pharmsita.safaubp.com/api/v1 \
  --frontend-url http://pharmsita.safaubp.com \
  --allow-http \
  --allow-degraded-readiness
```

Expected:

- live frontend root PASS;
- `/health` PASS;
- readiness PASS or only accepted staging WARN.

## Evidence to Return

Send sanitized output for:

```text
readlink -f /var/www/pharmsita/current
ls -la /var/www/pharmsita/current/dist/index.html
ls -la /var/www/pharmsita/current/backend/dist/server.js
npm run backend:check-production-env
sudo systemctl status pharmsita-backend --no-pager
sudo nginx -t
sudo systemctl status nginx --no-pager
curl -I http://pharmsita.safaubp.com
curl -sS http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health/ready
npm run deploy:vps:dry-run -- --api-base-url http://pharmsita.safaubp.com/api/v1 --frontend-url http://pharmsita.safaubp.com --allow-http --allow-degraded-readiness
```

Do not include secrets, passwords, tokens, or full `DATABASE_URL`.

## GO/BLOCKED Rule

GO for UAT routing when:

- root URL returns HTTP 200;
- `/api/v1/health` returns HTTP 200;
- backend service is active;
- Nginx config test passes;
- deployment dry-run live checks pass.

BLOCKED when:

- root still returns 404;
- `/api/v1/health` still returns 404;
- backend service fails;
- Nginx config fails;
- readiness reports an unreviewed DB/migration issue.

## HTTPS Follow-Up

After HTTP routing works and UAT smoke is acceptable, convert to HTTPS:

```bash
sudo certbot --nginx -d pharmsita.safaubp.com
sudo nginx -t
sudo systemctl reload nginx
sudo sed -i 's#CORS_ORIGIN=http://pharmsita.safaubp.com#CORS_ORIGIN=https://pharmsita.safaubp.com#' /etc/pharmsita/backend.env
sudo systemctl restart pharmsita-backend
```

Then verify:

```bash
curl -I https://pharmsita.safaubp.com
curl -sS https://pharmsita.safaubp.com/api/v1/health
curl -sS https://pharmsita.safaubp.com/api/v1/health/ready
```
