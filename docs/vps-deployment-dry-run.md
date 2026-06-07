# VPS Deployment Dry Run

Dokumen ini melengkapi `docs/production-deployment-runbook.md` untuk validasi deployment PharmSITA di VPS sebelum trafik user dibuka.

## Tujuan

Dry run memastikan empat hal:

1. Template Nginx masih meneruskan `/api/v1` ke backend dan menjaga `X-Request-Id`.
2. systemd menjalankan backend dengan production guard, restart policy, dan log path yang benar.
3. logrotate menjaga log backend/Nginx tidak memenuhi disk.
4. Endpoint HTTPS production/staging menjawab `/health`, `/health/ready`, dan root frontend.

## Local Template Check

Dari root project:

```powershell
npm.cmd run deploy:vps:dry-run -- --skip-network
```

Mode ini tidak memanggil domain luar. Hasil `WARN` untuk placeholder env masih wajar jika memakai file `deploy/vps/backend.env.example`; di VPS production, placeholder harus diganti.

## VPS/Staging HTTPS Check

Setelah Nginx, systemd, env, migration, dan service backend disiapkan di VPS:

```bash
npm run deploy:vps:dry-run -- --api-base-url https://pharmsita.example.ac.id/api/v1
```

Jika backend memakai subdomain API dan frontend memakai domain terpisah:

```bash
npm run deploy:vps:dry-run -- --api-base-url https://api-pharmsita.example.ac.id/api/v1 --frontend-url https://pharmsita.example.ac.id
```

Untuk staging yang readiness-nya boleh `degraded` sementara migration status ditinjau:

```bash
npm run deploy:vps:dry-run -- --api-base-url https://staging-pharmsita.example.ac.id/api/v1 --allow-degraded-readiness
```

Untuk lokal tanpa HTTPS:

```powershell
npm.cmd run deploy:vps:dry-run -- --api-base-url http://localhost:4000/api/v1 --allow-http --skip-frontend --allow-degraded-readiness
```

## Manual VPS Commands

Script Node tidak menggantikan validasi Linux native. Jalankan ini langsung di VPS:

```bash
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl restart pharmsita-backend
sudo systemctl status pharmsita-backend
sudo journalctl -u pharmsita-backend -n 100 --no-pager
sudo logrotate -d /etc/logrotate.d/pharmsita
curl -I https://pharmsita.example.ac.id/api/v1/health
curl -sS https://pharmsita.example.ac.id/api/v1/health/ready
```

## Passing Criteria

- `nginx -t` sukses.
- `systemctl status pharmsita-backend` aktif/running.
- `/api/v1/health` mengembalikan HTTP 200 dan `status=ok`.
- Response `/api/v1/health` membawa `X-Request-Id` yang sama dengan request.
- `/api/v1/health/ready` bernilai `ready` untuk production.
- Root frontend mengembalikan HTML Vite/React build.
- Log backend masuk ke `/var/log/pharmsita/`.
- Log Nginx masuk ke `/var/log/nginx/pharmsita_access.log` dan `/var/log/nginx/pharmsita_error.log`.
