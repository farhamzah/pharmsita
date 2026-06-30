# VPS Operator Evidence Intake After Nginx Apply

Task: 196
Date: 2026-07-01 Asia/Jakarta
Domain: http://pharmsita.safaubp.com
Baseline artifact: pharmsita-task195-48cdfc5
Priority: Extra High
Status: BLOCKED - OPERATOR EVIDENCE NOT RECEIVED

## Purpose

This document is the intake and review packet for operator output after applying the temporary
HTTP Nginx config on the VPS.

The goal is to decide whether live UAT routing is GO or BLOCKED based on real VPS evidence:

- `nginx -t`;
- `systemctl status pharmsita-backend`;
- frontend root response;
- `/api/v1/health`;
- `/api/v1/health/ready`;
- deployment dry-run live checks.

## Current Public Verification

Checked from the local machine before receiving operator evidence:

| URL | Expected | Current |
| --- | --- | --- |
| `http://pharmsita.safaubp.com` | HTTP 200 frontend HTML | HTTP 404 Nginx |
| `http://pharmsita.safaubp.com/api/v1/health` | HTTP 200 JSON `status=ok` | HTTP 404 Nginx |
| `http://pharmsita.safaubp.com/api/v1/health/ready` | HTTP 200 readiness JSON | HTTP 404 Nginx |

Initial decision: BLOCKED.

## Evidence Required from Operator

Paste or attach sanitized command output for each item below.
Do not include passwords, tokens, `AUTH_SECRET`, or full `DATABASE_URL`.

### 1. Active Release

```bash
readlink -f /var/www/pharmsita/current
ls -la /var/www/pharmsita/current/dist/index.html
ls -la /var/www/pharmsita/current/backend/dist/server.js
ls -la /var/www/pharmsita/current/deploy/vps/nginx/pharmsita.safaubp.com-http.conf.example
```

Expected:

- `current` points to the intended PharmSITA release;
- frontend and backend build files exist;
- domain Nginx config exists in the release.

### 2. Backend Env Guard and Service

```bash
cd /var/www/pharmsita/current
npm run backend:check-production-env
sudo systemctl status pharmsita-backend --no-pager
sudo journalctl -u pharmsita-backend -n 80 --no-pager
```

Expected:

- env guard passes;
- `pharmsita-backend` is `active (running)`;
- no database connection or startup guard error.

### 3. Nginx Config and Service

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo nginx -T | grep -n "pharmsita.safaubp.com" -C 5
```

Expected:

- `nginx -t` passes;
- Nginx is active;
- active config contains `server_name pharmsita.safaubp.com`;
- active config points root to `/var/www/pharmsita/current/dist`;
- active config proxies `/api/v1` to `127.0.0.1:4000`.

### 4. VPS Local Curl

Run from the VPS:

```bash
curl -I http://pharmsita.safaubp.com
curl -sS http://pharmsita.safaubp.com | head
curl -I http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health/ready
```

Expected:

- root returns HTTP 200;
- root HTML contains the app shell;
- `/api/v1/health` returns HTTP 200 and `status=ok`;
- readiness returns HTTP 200 with ready status, or a clear staging-only degraded reason.

### 5. Deployment Dry-Run

Run from `/var/www/pharmsita/current`:

```bash
npm run deploy:vps:dry-run -- \
  --api-base-url http://pharmsita.safaubp.com/api/v1 \
  --frontend-url http://pharmsita.safaubp.com \
  --allow-http \
  --allow-degraded-readiness
```

Expected:

- config checks pass;
- live frontend root passes;
- `/health` passes;
- readiness passes or has an accepted staging-only warning.

## Reviewer Checklist

| Gate | Required Result | Actual | Decision |
| --- | --- | --- | --- |
| Active release | correct release and build files present | Pending | Pending |
| Backend env guard | PASS | Pending | Pending |
| Backend service | active/running | Pending | Pending |
| Nginx config | `nginx -t` PASS | Pending | Pending |
| Nginx active domain | `pharmsita.safaubp.com` served by PharmSITA config | Pending | Pending |
| Frontend root | HTTP 200 | HTTP 404 from public check | BLOCKED |
| API health | HTTP 200 `status=ok` | HTTP 404 from public check | BLOCKED |
| API readiness | ready or accepted staging warning | HTTP 404 from public check | BLOCKED |
| Deployment dry-run | PASS or accepted staging warning only | Pending | Pending |

## Decision Rule

UAT routing is GO only when:

- frontend root returns HTTP 200 from public network;
- `/api/v1/health` returns HTTP 200;
- backend service is active;
- Nginx config test passes;
- deployment dry-run live checks pass.

UAT routing remains BLOCKED if:

- root still returns 404;
- `/api/v1/health` still returns 404;
- backend service fails;
- Nginx config is not active for the domain;
- readiness shows an unreviewed database or migration issue.

## Current Decision

BLOCKED.

Operator evidence has not been received, and the public domain still returns Nginx 404 for root and
API health routes.

## Next Action

Operator must apply the config using:

```text
docs/operator-apply-nginx-http-config-live-routing-verification.md
```

After operator output is provided, this packet will be updated with PASS/BLOCKED decision.
