# Operator Apply VPS Routing Remediation and Evidence Capture

Task: 202
Date: 2026-07-01 Asia/Jakarta
Domain: http://pharmsita.safaubp.com
Baseline artifact: pharmsita-task200-56c15d4
Priority: Extra High
Status: READY FOR VPS OPERATOR

## Purpose

Apply the Task 200 routing remediation on the VPS and capture evidence in one folder.

This task must be executed on the VPS because it changes:

- Nginx active config;
- `pharmsita-backend` systemd service state;
- public routing for `http://pharmsita.safaubp.com`;
- proxy routing from `/api/v1` to backend port `4000`.

Local/public check before operator execution still returns Nginx 404 for root, health, and readiness.

## Artifact and Script Boundary

Current clean artifact from Task 201:

```text
pharmsita-task200-56c15d4.tar.gz
```

That artifact already includes:

- `deploy/vps/nginx/pharmsita.safaubp.com-http.conf.example`;
- `docs/vps-routing-remediation-404-to-200.md`.

This Task 202 adds:

- `deploy/vps/apply-routing-remediation-and-capture.sh`;
- this operator evidence capture packet.

Before Task 202 is committed and a new artifact is rebuilt, the operator has two options:

- run the manual commands from `docs/vps-routing-remediation-404-to-200.md`; or
- upload/copy `deploy/vps/apply-routing-remediation-and-capture.sh` into the active release and run the script.

After the next commit/rebuild, the script should be available inside the clean artifact automatically.

## Operator Command

Run on VPS as the deployment operator:

```bash
cd /var/www/pharmsita/current
bash deploy/vps/apply-routing-remediation-and-capture.sh
```

Optional overrides:

```bash
PHARMSITA_DOMAIN=pharmsita.safaubp.com \
PHARMSITA_RELEASE_DIR=/var/www/pharmsita/current \
PHARMSITA_EVIDENCE_ROOT=/tmp/pharmsita-task202-routing-evidence \
bash deploy/vps/apply-routing-remediation-and-capture.sh
```

The script writes evidence to:

```text
/tmp/pharmsita-task202-routing-evidence/<timestamp>/
```

## What the Script Does

The script performs these actions:

1. captures current release symlink and required build file checks;
2. captures safe backend env values without printing secrets;
3. runs `npm run backend:check-production-env`;
4. restarts `pharmsita-backend`;
5. confirms backend is active and port `4000` is listening;
6. checks internal backend health via `127.0.0.1:4000`;
7. captures active Nginx config before remediation;
8. backs up `/etc/nginx/conf.d/pharmsita.conf`;
9. copies the PharmSITA HTTP config to `/etc/nginx/conf.d/pharmsita.conf`;
10. runs `sudo nginx -t`;
11. reloads Nginx only if `nginx -t` passes;
12. captures active Nginx config after remediation;
13. captures public root, health, and readiness responses;
14. runs `npm run deploy:vps:dry-run` against the live HTTP domain;
15. writes `GO-NO-GO.md` and `evidence-manifest.json`.

## Evidence Files to Return

Send the full evidence folder, or compress it:

```bash
cd /tmp
tar -czf pharmsita-task202-routing-evidence.tar.gz pharmsita-task202-routing-evidence
```

Required files inside the latest timestamp folder:

| File | Purpose |
| --- | --- |
| `GO-NO-GO.md` | final GO/BLOCKED decision from the script |
| `evidence-manifest.json` | machine-readable gate result |
| `operator-run.log` | ordered execution log |
| `backend-status.txt` | backend service state |
| `backend-port.txt` | port `4000` listener proof |
| `internal-health.txt` | backend health from localhost |
| `nginx-test.txt` | `sudo nginx -t` output |
| `nginx-status.txt` | Nginx service state |
| `nginx-active-domain-after.txt` | active server block proof |
| `nginx-active-root-after.txt` | active frontend root proof |
| `nginx-active-api-after.txt` | active `/api/v1` route proof |
| `public-root-head.txt` | public root HTTP status |
| `public-health-head.txt` | public health HTTP status |
| `public-health.txt` | public health body |
| `public-ready.txt` | public readiness body |
| `deploy-dry-run.txt` | live deployment dry-run result |

Do not send passwords, tokens, `AUTH_SECRET`, or full `DATABASE_URL`.

## GO Rule

Routing is GO for controlled UAT only when:

- `http://pharmsita.safaubp.com` returns HTTP 200;
- `http://pharmsita.safaubp.com/api/v1/health` returns HTTP 200;
- `pharmsita-backend` is active;
- backend listens on port `4000`;
- `sudo nginx -t` passes;
- active Nginx config contains `server_name pharmsita.safaubp.com`;
- active Nginx config points root to `/var/www/pharmsita/current/dist`;
- active Nginx config proxies `/api/v1` to `127.0.0.1:4000`;
- live dry-run passes.

## BLOCKED Rule

Routing remains BLOCKED if:

- root remains 404;
- `/api/v1/health` remains 404;
- backend service fails;
- port `4000` is not listening;
- `sudo nginx -t` fails;
- active Nginx config does not include the PharmSITA server block;
- dry-run fails on live frontend or health.

## Reviewer Next Step

After the operator sends the evidence folder:

1. read `GO-NO-GO.md`;
2. confirm no secrets are included;
3. confirm root and health are 200 from public network;
4. decide UAT routing GO/BLOCKED.

If GO, start controlled UAT. If BLOCKED, create a specific remediation task from the failed gate.
