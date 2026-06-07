# VPS Live Cutover Execution QA

Dokumen ini dipakai setelah release PharmSITA dipasang di VPS/staging, symlink `current` sudah diarahkan ke release baru, dan service sudah di-restart.

## Tujuan

Live cutover QA membuktikan kondisi real server:

- artifact yang dipakai masih cocok dengan `artifact-checksums.sha256`
- `/var/www/pharmsita/current` benar-benar menunjuk release aktif
- `nginx -t` valid
- service `pharmsita-backend` aktif di systemd
- backup gate PostgreSQL masih PASS sebelum/selama window cutover
- domain HTTPS menjawab `/health`, `/health/ready`, dan frontend root
- production no-demo smoke preflight PASS tanpa membuat akun demo

## Local Harness Check

Di development Windows/lokal, jalankan mode skip untuk memastikan script dan report tidak rusak:

```powershell
npm.cmd run release:live-cutover:qa -- --skip-system --skip-network --skip-db --force
```

Mode ini tidak membuktikan VPS live, tetapi berguna untuk QA script.

## VPS Live Command

Jalankan dari release aktif:

```bash
cd /var/www/pharmsita/current
export DATABASE_URL="postgres://user:password@host:5432/pharmsita"

npm run release:live-cutover:qa -- \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --require-current-symlink \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --require-db-gate \
  --require-restore-drill \
  --execute-system-checks \
  --require-system \
  --api-base-url https://pharmsita.example.ac.id/api/v1 \
  --frontend-url https://pharmsita.example.ac.id \
  --require-network \
  --force
```

Jika `nginx -t` butuh root, jalankan sebagai user yang punya akses atau tambahkan:

```bash
--sudo-system
```

## Output

Script membuat dua file di `--work-dir`:

| File | Fungsi |
|---|---|
| `LIVE-CUTOVER-QA.md` | Report operator yang bisa dilampirkan ke catatan release |
| `live-cutover-qa-report.json` | Report mesin untuk audit/arsip |

Default `--work-dir` adalah `releases/live-cutover-qa` relatif ke release/script yang berjalan. Di VPS boleh diarahkan ke `/tmp/pharmsita-live-cutover-qa`.

## Pass Criteria

Cutover dianggap aman dibuka ke user jika semua ini PASS:

- `Artifact checksum`
- `Current symlink`
- `Nginx config test`
- `systemd service active`
- `Backup gate`
- `Live HTTPS dry-run`
- `Production no-demo smoke`

Jika salah satu FAIL, jangan lanjutkan traffic user baru. Rollback aplikasi lebih dulu jika service/domain sudah mengarah ke release baru.

## Kapan Skip Boleh Dipakai

- `--skip-system`: hanya untuk QA lokal/non-VPS.
- `--skip-network`: hanya sebelum domain diarahkan atau saat DNS belum siap.
- `--skip-db`: hanya untuk mengecek script/report, bukan cutover production.

Untuk production/staging real, gunakan `--require-system`, `--require-network`, dan `--require-db-gate`.

## Evidence Capture Setelah PASS

Setelah live QA PASS, jalankan evidence capture untuk membuat `GO-NO-GO.md`:

```bash
npm run release:live-evidence:capture -- --release-dir /var/www/pharmsita/current --release-id <release-id> --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --require-current-symlink --database-url "$DATABASE_URL" --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json --require-db-gate --require-restore-drill --execute-system-checks --require-system --api-base-url https://pharmsita.example.ac.id/api/v1 --require-network --operator "<nama-operator>" --force
```
