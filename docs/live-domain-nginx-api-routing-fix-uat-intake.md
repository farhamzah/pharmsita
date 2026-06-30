# Live Domain Nginx/API Routing Fix and UAT Environment Intake

Task: 192
Date: 2026-07-01 Asia/Jakarta
Domain: http://pharmsita.safaubp.com
Target HTTPS later: https://pharmsita.safaubp.com
Priority: Extra High
Status: BLOCKED ON VPS ROUTING

## Current Live Evidence

The domain is reachable but not serving PharmSITA yet.

| Check | Result | Evidence |
| --- | --- | --- |
| `GET /` | BLOCKED | HTTP `404 Not Found`, `Server: nginx/1.22.1` |
| `GET /api/v1/health` | BLOCKED | HTTP `404 Not Found`, `Server: nginx/1.22.1` |
| `GET /api/v1/health/ready` | BLOCKED | HTTP `404 Not Found`, `Server: nginx/1.22.1` |

Interpretation:

- DNS/VPS/Nginx are reachable.
- PharmSITA frontend is not served from the domain root.
- `/api/v1` is not proxied to the PharmSITA backend.
- UAT cannot start from this domain until the root page and API health are reachable.

## Local Template Evidence

The local deployment templates are structurally ready:

- backend env template exists and expects `PORT=4000`, `API_PREFIX=/api/v1`, `DB_ADAPTER=postgres`;
- systemd template runs `backend/dist/server.js` from `/var/www/pharmsita/current`;
- default Nginx template has SPA fallback and `/api/v1` proxy;
- a temporary HTTP UAT Nginx config is now available at:
  `deploy/vps/nginx/pharmsita.safaubp.com-http.conf.example`.

## Immediate VPS Fix Path

Use the latest clean artifact from Task 191 unless a newer artifact is built:

```text
pharmsita-task191-e37dee7.tar.gz
```

### 1. Verify Release Is Installed

On VPS:

```bash
ls -la /var/www/pharmsita/releases
ls -la /var/www/pharmsita/current
readlink -f /var/www/pharmsita/current
ls -la /var/www/pharmsita/current/dist/index.html
ls -la /var/www/pharmsita/current/backend/dist/server.js
```

GO condition:

- `current` points to the active release;
- `dist/index.html` exists;
- `backend/dist/server.js` exists.

BLOCKED condition:

- release is not extracted;
- symlink is missing or points to the wrong folder;
- frontend/backend build output is missing.

### 2. Prepare Backend Environment

Edit `/etc/pharmsita/backend.env`:

```bash
sudo nano /etc/pharmsita/backend.env
```

Minimum values:

```env
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1
CORS_ORIGIN=http://pharmsita.safaubp.com
DB_ADAPTER=postgres
DATABASE_URL=postgres://<user>:<password>@127.0.0.1:5432/pharmsita
DATABASE_SSL=false
AUTH_SECRET=<long-random-secret>
```

When HTTPS is activated, update:

```env
CORS_ORIGIN=https://pharmsita.safaubp.com
```

Do not use demo mode, local JSON DB, placeholder password, or placeholder `AUTH_SECRET`.

### 3. Start Backend Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable pharmsita-backend
sudo systemctl restart pharmsita-backend
sudo systemctl status pharmsita-backend --no-pager
sudo journalctl -u pharmsita-backend -n 100 --no-pager
```

GO condition:

- service is `active (running)`;
- no production guard failure;
- no database connection failure.

### 4. Install Temporary HTTP Nginx Config

Use the temporary UAT config until HTTPS certificate is ready:

```bash
sudo cp /var/www/pharmsita/current/deploy/vps/nginx/pharmsita.safaubp.com-http.conf.example /etc/nginx/conf.d/pharmsita.conf
sudo nginx -t
sudo systemctl reload nginx
```

Important:

- do not keep another PharmSITA config with duplicate `map`, `log_format`, or `upstream` names active;
- if `/etc/nginx/sites-enabled/default` captures the domain first, disable or adjust the default site.

### 5. Verify HTTP UAT Routing

From VPS and from local machine:

```bash
curl -I http://pharmsita.safaubp.com
curl -sS http://pharmsita.safaubp.com | head
curl -I http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health/ready
```

Expected:

- root returns HTTP `200`;
- root HTML contains the app root;
- `/api/v1/health` returns HTTP `200` and `status=ok`;
- `/api/v1/health/ready` returns ready or a known non-production readiness detail to fix.

### 6. Run Deployment Dry-Run for HTTP UAT

```bash
cd /var/www/pharmsita/current
npm run deploy:vps:dry-run -- \
  --api-base-url http://pharmsita.safaubp.com/api/v1 \
  --frontend-url http://pharmsita.safaubp.com \
  --allow-http \
  --allow-degraded-readiness
```

GO condition:

- frontend root PASS;
- `/health` PASS;
- readiness PASS or a reviewed WARN for staging only.

BLOCKED condition:

- root remains 404;
- `/api/v1/health` remains 404;
- backend service is not active;
- Nginx config test fails.

## HTTPS Conversion Path

After HTTP UAT routing is healthy:

```bash
sudo certbot --nginx -d pharmsita.safaubp.com
sudo nginx -t
sudo systemctl reload nginx
```

Then update `/etc/pharmsita/backend.env`:

```env
CORS_ORIGIN=https://pharmsita.safaubp.com
```

Restart backend:

```bash
sudo systemctl restart pharmsita-backend
```

Verify:

```bash
curl -I https://pharmsita.safaubp.com
curl -sS https://pharmsita.safaubp.com/api/v1/health
curl -sS https://pharmsita.safaubp.com/api/v1/health/ready
```

## UAT Environment Intake

Before UAT starts, fill these fields:

| Item | Value | Status |
| --- | --- | --- |
| Frontend URL | `http://pharmsita.safaubp.com` | Pending 200 |
| API base URL | `http://pharmsita.safaubp.com/api/v1` | Pending health 200 |
| HTTPS target | `https://pharmsita.safaubp.com` | Pending certificate |
| Release ID | `pharmsita-task191-e37dee7` | Pending VPS verification |
| PostgreSQL database | `pharmsita` | Pending operator confirmation |
| Backend service | `pharmsita-backend` | Pending active/running evidence |
| Admin UAT account | `uat-admin` or approved admin | Pending |
| Mahasiswa UAT account | `uat-mahasiswa-001` | Pending |
| Dosen UAT account | `uat-dosen-001` | Pending |
| Koordinator UAT account | `uat-koordinator` | Pending |
| Master data | academic period, thesis types, supporting docs, requirements | Pending |
| Evidence folder | `/tmp/pharmsita-uat-evidence` or agreed location | Pending |

## Decision

Current decision: BLOCKED for live UAT.

The domain is reachable, but Nginx/API routing must be fixed first.

UAT can start after:

- frontend root returns HTTP 200;
- `/api/v1/health` returns HTTP 200;
- backend service is active;
- PostgreSQL migrations are current;
- UAT accounts and master data are ready.
