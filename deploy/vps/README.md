# PharmSITA VPS Deployment Templates

Folder ini berisi template operasional untuk deployment PharmSITA standalone di VPS Linux.

## File

| File | Target server | Fungsi |
|---|---|---|
| `backend.env.example` | `/etc/pharmsita/backend.env` | Environment backend production untuk systemd |
| `nginx/pharmsita.conf.example` | `/etc/nginx/conf.d/pharmsita.conf` | Serve frontend `dist/` dan reverse proxy `/api/v1` ke backend |
| `systemd/pharmsita-backend.service.example` | `/etc/systemd/system/pharmsita-backend.service` | Process manager backend Node.js |
| `logrotate/pharmsita.example` | `/etc/logrotate.d/pharmsita` | Rotasi log backend dan log Nginx PharmSITA |

## Assumption

Template memakai layout release berikut:

```text
/var/www/pharmsita/current
  dist/
  backend/dist/
  package.json
  node_modules/
```

Backend berjalan di `127.0.0.1:4000` dan hanya Nginx yang menerima trafik publik.

## Install Outline

```bash
sudo useradd --system --home /var/www/pharmsita --shell /usr/sbin/nologin pharmsita
sudo mkdir -p /etc/pharmsita /var/www/pharmsita/current /var/log/pharmsita
sudo chown -R pharmsita:pharmsita /var/www/pharmsita /var/log/pharmsita
sudo cp deploy/vps/backend.env.example /etc/pharmsita/backend.env
sudo cp deploy/vps/systemd/pharmsita-backend.service.example /etc/systemd/system/pharmsita-backend.service
sudo cp deploy/vps/nginx/pharmsita.conf.example /etc/nginx/conf.d/pharmsita.conf
sudo cp deploy/vps/logrotate/pharmsita.example /etc/logrotate.d/pharmsita
sudo chmod 640 /etc/pharmsita/backend.env
sudo systemctl daemon-reload
sudo systemctl enable pharmsita-backend
```

Sebelum start production, edit domain, database, dan secret di `/etc/pharmsita/backend.env`, lalu jalankan migration dan production smoke test dari runbook.

Validasi template lokal:

```powershell
npm.cmd run deploy:vps:dry-run -- --skip-network
```

Validasi HTTPS setelah VPS aktif:

```bash
npm run deploy:vps:dry-run -- --api-base-url https://pharmsita.example.ac.id/api/v1
```

Membuat artifact release dari build lokal:

```powershell
npm.cmd run release:package
```

Rehearsal cutover release sebelum symlink `current` dipindah:

```bash
cd /var/www/pharmsita/releases/<release-id>
npm run release:cutover:drill -- --release-archive ../<release-id>.tar.gz --artifact-checksums ../artifact-checksums.sha256 --work-dir /tmp/pharmsita-cutover-drill --database-url "$DATABASE_URL" --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json --require-db-gate --require-restore-drill --api-base-url https://pharmsita.example.ac.id/api/v1 --force
```

QA live setelah symlink `current` aktif dan service di-restart:

```bash
cd /var/www/pharmsita/current
npm run release:live-cutover:qa -- --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --require-current-symlink --database-url "$DATABASE_URL" --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json --require-db-gate --require-restore-drill --execute-system-checks --require-system --api-base-url https://pharmsita.example.ac.id/api/v1 --require-network --force
```

Capture evidence dan Go/No-Go report:

```bash
cd /var/www/pharmsita/current
npm run release:live-evidence:capture -- --release-dir /var/www/pharmsita/current --release-id <release-id> --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --require-current-symlink --database-url "$DATABASE_URL" --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json --require-db-gate --require-restore-drill --execute-system-checks --require-system --api-base-url https://pharmsita.example.ac.id/api/v1 --require-network --operator "<nama-operator>" --force
```

Jika decision bukan `GO`, buat remediation plan:

```bash
npm run release:go-no-go:remediate -- --evidence-dir releases/live-evidence --operator "<nama-operator>" --force
```

Review paket evidence operator sebelum traffic production penuh:

```bash
npm run release:operator-evidence:review -- --evidence-dir releases/live-evidence --remediation-dir releases/live-evidence --reviewer "<nama-reviewer>" --operator "<nama-operator>" --require-go --force
```

Buat packet sign-off final setelah review `APPROVED`:

```bash
npm run release:production-signoff:packet -- --evidence-dir releases/live-evidence --review-dir releases/live-evidence --remediation-dir releases/live-evidence --release-id <release-id> --operator "<nama-operator>" --reviewer "<nama-reviewer>" --signer "<nama-approver>" --require-approved --force
```

Atau jalankan satu orchestrator real VPS evidence run:

```bash
npm run release:production-evidence:run -- --release-id <release-id> --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --database-url "$DATABASE_URL" --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json --api-base-url https://pharmsita.example.ac.id/api/v1 --frontend-url https://pharmsita.example.ac.id --operator "<nama-operator>" --reviewer "<nama-reviewer>" --signer "<nama-approver>" --execute --force
```

Setelah folder output evidence di-upload ke reviewer:

```bash
npm run release:production-evidence:upload-review -- --upload-dir /tmp/pharmsita-production-evidence-run --release-id <release-id> --reviewer "<nama-reviewer>" --require-signed-off --force
```
