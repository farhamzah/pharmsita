# VPS Live QA Evidence Capture

Dokumen ini dipakai untuk mengambil bukti rilis PharmSITA dari VPS/domain asli dan menghasilkan keputusan Go/No-Go.

## Tujuan

Evidence capture melengkapi live cutover QA dengan arsip bukti:

- checksum artifact dan file `artifact-checksums.sha256`
- bukti symlink `current`
- output live cutover QA
- output raw `nginx -t`
- output raw `systemctl is-active/status`
- tail log `journalctl`
- response HTTPS `/health`, `/health/ready`, dan frontend root
- report final `GO-NO-GO.md`

## Local Script QA

Mode ini hanya untuk memastikan script bisa berjalan di development lokal:

```powershell
npm.cmd run release:live-evidence:capture -- --skip-system --skip-network --skip-db --allow-incomplete --force
```

Hasil lokal biasanya `INCOMPLETE`, karena systemd/Nginx/domain VPS memang tidak dicek.

## VPS Evidence Command

Jalankan setelah:

- release sudah diekstrak
- `npm ci --omit=dev` sudah selesai
- symlink `/var/www/pharmsita/current` sudah mengarah ke release baru
- `pharmsita-backend` sudah di-restart
- domain HTTPS sudah mengarah ke VPS

```bash
cd /var/www/pharmsita/current
export DATABASE_URL="postgres://user:password@host:5432/pharmsita"

npm run release:live-evidence:capture -- \
  --release-dir /var/www/pharmsita/current \
  --release-id <release-id> \
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
  --operator "<nama-operator>" \
  --notes "Production cutover evidence" \
  --force
```

Jika command system butuh sudo:

```bash
--sudo-system
```

## Output

Default output ada di `releases/live-evidence` relatif ke release aktif. Untuk VPS bisa diarahkan ke `/tmp/pharmsita-live-evidence`:

```bash
--work-dir /tmp/pharmsita-live-evidence
```

File penting:

| File | Fungsi |
|---|---|
| `GO-NO-GO.md` | Keputusan final operator |
| `evidence-manifest.json` | Manifest bukti, checksum, dan gate status |
| `artifact-evidence.txt` | Checksum artifact dan checksum file |
| `current-symlink.txt` | Bukti symlink aktif |
| `live-cutover-qa-command.txt` | Output delegated live QA |
| `raw-nginx-test.txt` | Output `nginx -t` |
| `raw-systemctl-is-active.txt` | Output status aktif service |
| `raw-systemctl-status.txt` | Output status detail service |
| `raw-journalctl-tail.txt` | Tail log backend |
| `raw-http-health.json` | Response `/health` |
| `raw-http-ready.json` | Response `/health/ready` |
| `raw-http-frontend.json` | Response frontend root |

## Decision Rule

- `GO`: tidak ada `FAIL`, tidak ada evidence wajib yang skip, dan tidak ada warning.
- `GO WITH REVIEW`: tidak ada `FAIL`, tetapi ada `WARN` yang harus ditandatangani operator.
- `INCOMPLETE`: tidak ada `FAIL`, tetapi ada evidence yang diskip. Jangan buka traffic production penuh.
- `NO-GO`: minimal satu gate wajib gagal. Stop cutover atau rollback release.

## Remediation Jika Bukan GO

```bash
npm run release:go-no-go:remediate -- --evidence-dir /tmp/pharmsita-live-evidence --output-dir /tmp/pharmsita-remediation --operator "<nama-operator>" --force
```

Ikuti `REMEDIATION.md`, lalu jalankan ulang evidence capture tanpa skip flags.

## Catatan Keamanan

Script menyensor password PostgreSQL pada output report. Tetap perlakukan folder evidence sebagai dokumen operasional sensitif karena berisi domain, path server, dan cuplikan log.
