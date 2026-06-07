# VPS Release Cutover Drill

Dokumen ini menjelaskan rehearsal cutover release PharmSITA sebelum trafik user dibuka.

## Tujuan

Cutover drill memastikan empat gate besar sudah tersambung:

- artifact release dan rollback bundle bisa diverifikasi checksum-nya
- payload release tidak membawa secret, `node_modules`, local database, backup, atau seed demo
- backup gate PostgreSQL bisa memblokir migration jika backup/restore drill belum aman
- template Nginx/systemd dan live smoke test punya satu checklist operasional

## Local Artifact Drill

Gunakan mode ini setelah build dan package selesai, sebelum upload ke VPS.

```powershell
npm.cmd run build
npm.cmd run backend:build
npm.cmd run release:package -- --release-id pharmsita-2026.06.08-1 --force
npm.cmd run release:cutover:drill -- --release-archive releases\pharmsita-2026.06.08-1\pharmsita-2026.06.08-1.tar.gz --work-dir releases\cutover-drill-local --skip-network --skip-db --force
```

Mode lokal memeriksa:

- `artifact-checksums.sha256`
- extract archive
- `manifest.json`
- `checksums.sha256`
- payload wajib
- excluded path boundary
- checklist Nginx/systemd sebagai manual gate

## Staging/VPS Drill

Setelah archive dan `artifact-checksums.sha256` di-upload ke staging/VPS:

```bash
cd /var/www/pharmsita/releases
sha256sum -c artifact-checksums.sha256
tar -xzf pharmsita-2026.06.08-1.tar.gz
cd pharmsita-2026.06.08-1
npm ci --omit=dev
npm run release:cutover:drill \
  --release-archive ../pharmsita-2026.06.08-1.tar.gz \
  --artifact-checksums ../artifact-checksums.sha256 \
  --work-dir /tmp/pharmsita-cutover-drill \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --require-db-gate \
  --require-restore-drill \
  --api-base-url https://pharmsita.example.ac.id/api/v1 \
  --frontend-url https://pharmsita.example.ac.id \
  --force
```

Mode staging/VPS menambah:

- `db:migrate:gate` memakai manifest backup yang sudah diverifikasi
- requirement restore drill jika `--require-restore-drill` dipakai
- `deploy:vps:dry-run` terhadap URL live dan template dari artifact
- `smoke:production:no-demo --preflight-only` jika `DATABASE_URL` dan `API_BASE_URL` tersedia
- command final untuk `release:production-signoff:packet` setelah evidence review `APPROVED`
- command orchestrator `release:production-evidence:run` untuk Task 113 real VPS evidence run
- command reviewer `release:production-evidence:upload-review` untuk Task 114 evidence upload review

## Output

Script membuat dua file di `--work-dir`:

| File | Fungsi |
|---|---|
| `CUTOVER-DRILL.md` | Checklist cutover dan command yang bisa dijalankan operator |
| `cutover-drill-report.json` | Hasil mesin untuk arsip release/QA |

Jika ada status `FAIL`, cutover harus dihentikan. Status `WARN` boleh dilanjutkan hanya setelah operator memahami risikonya, misalnya placeholder env pada template yang memang belum diganti di artifact contoh.

## Manual Gate di VPS

Script tidak menjalankan command `sudo` secara otomatis. Operator tetap menjalankan:

```bash
sudo nginx -t
sudo systemctl restart pharmsita-backend
sudo systemctl status pharmsita-backend --no-pager
```

Alasannya: command tersebut menyentuh service production dan harus dilakukan sadar oleh operator setelah backup/migration gate PASS.

## Cutover Boundary

- Jangan update symlink `current` sebelum artifact checksum, backup verify, restore drill, dan migration gate PASS.
- Jangan menjalankan seed demo di production.
- Simpan release sebelumnya dan rollback bundle sebelum restart service.
- Jika smoke test gagal setelah symlink pindah, rollback aplikasi dulu, lalu analisa database hanya jika ada indikasi migration/data issue.
