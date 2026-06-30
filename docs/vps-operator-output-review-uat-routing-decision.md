# VPS Operator Output Review and UAT Routing Decision

Task: 198
Date: 2026-07-01 Asia/Jakarta
Domain: http://pharmsita.safaubp.com
Baseline artifact: pharmsita-task197-7476d1d
Priority: Extra High
Decision: BLOCKED

## Review Scope

This review decides whether the PharmSITA live domain is ready to start controlled UAT.

Required evidence:

- operator output from `nginx -t`;
- operator output from `systemctl status pharmsita-backend`;
- operator output from `systemctl status nginx`;
- public or VPS curl output for the frontend root;
- public or VPS curl output for `/api/v1/health`;
- public or VPS curl output for `/api/v1/health/ready`;
- deployment dry-run output with live URL.

## Evidence Received

Operator VPS output has not been provided in this task.

Available evidence is public HTTP verification from the local machine.

## Public Verification Result

| URL | Expected | Actual | Decision |
| --- | --- | --- | --- |
| `http://pharmsita.safaubp.com` | HTTP 200 frontend HTML | HTTP 404 Nginx page | BLOCKED |
| `http://pharmsita.safaubp.com/api/v1/health` | HTTP 200 JSON `status=ok` | HTTP 404 Nginx page | BLOCKED |
| `http://pharmsita.safaubp.com/api/v1/health/ready` | HTTP 200 readiness JSON | HTTP 404 Nginx page | BLOCKED |

Observed response:

```text
HTTP/1.1 404 Not Found
Server: nginx/1.22.1
```

The root body is the default Nginx 404 HTML, not the PharmSITA frontend.

## Interpretation

DNS and Nginx are reachable, but the active Nginx server block is not routing the domain to
PharmSITA. The API route is also not proxied to the backend.

Most likely unresolved items:

- `/etc/nginx/conf.d/pharmsita.conf` has not been installed or reloaded;
- another default Nginx site is still capturing the domain;
- `/var/www/pharmsita/current` is missing or points to the wrong release;
- backend service is not running on `127.0.0.1:4000`;
- `/etc/pharmsita/backend.env` is missing or failed the production guard.

## UAT Decision

UAT routing is BLOCKED.

Controlled UAT cannot start from `http://pharmsita.safaubp.com` until:

- frontend root returns HTTP 200;
- `/api/v1/health` returns HTTP 200;
- backend service evidence is provided;
- Nginx config evidence is provided;
- live deployment dry-run passes.

## Required Operator Output

Operator must run the packet from:

```text
docs/operator-apply-nginx-http-config-live-routing-verification.md
```

Then provide sanitized output for:

```bash
readlink -f /var/www/pharmsita/current
ls -la /var/www/pharmsita/current/dist/index.html
ls -la /var/www/pharmsita/current/backend/dist/server.js
npm run backend:check-production-env
sudo systemctl status pharmsita-backend --no-pager
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo nginx -T | grep -n "pharmsita.safaubp.com" -C 5
curl -I http://pharmsita.safaubp.com
curl -sS http://pharmsita.safaubp.com/api/v1/health
curl -sS http://pharmsita.safaubp.com/api/v1/health/ready
npm run deploy:vps:dry-run -- --api-base-url http://pharmsita.safaubp.com/api/v1 --frontend-url http://pharmsita.safaubp.com --allow-http --allow-degraded-readiness
```

Do not share passwords, tokens, `AUTH_SECRET`, or full `DATABASE_URL`.

## Next Decision Point

After operator output is provided:

- if root and health become HTTP 200, review can move to UAT GO candidate;
- if root/API remain 404, remediation must focus on active Nginx server block and symlink/release path;
- if root is 200 but API health fails, remediation must focus on backend service, env, or proxy;
- if health is OK but readiness fails, remediation must focus on PostgreSQL/migration readiness.
