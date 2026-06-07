# Real VPS Production Evidence Run

Dokumen ini adalah panduan Task 113 untuk menjalankan evidence production asli di VPS/domain PharmSITA. Script `release:production-evidence:run` mengorkestrasi rangkaian:

1. live cutover QA
2. live evidence capture
3. remediation plan jika evidence bukan `GO`
4. operator evidence review
5. production sign-off packet

## Boundary Penting

Jangan memakai domain placeholder `pharmsita.example.ac.id` untuk sign-off production. Domain/API production asli harus diberikan lewat `--api-base-url` dan `--frontend-url`.

Jangan memakai `--allow-incomplete` untuk approval production. Flag itu hanya untuk latihan lokal atau intake evidence yang belum lengkap.

## Dry-Run Command

Dry-run membuat command packet tanpa menjalankan health check atau network call:

```bash
npm run release:production-evidence:run -- \
  --release-id <release-id> \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --api-base-url https://<domain-asli>/api/v1 \
  --frontend-url https://<domain-asli> \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --force
```

Output dry-run:

- `REAL-VPS-EVIDENCE-RUN.md`
- `real-vps-evidence-run.json`

## Execute Command di VPS

Jalankan dari release aktif di VPS setelah symlink, Nginx, systemd, database backup, dan migration gate sudah siap:

```bash
cd /var/www/pharmsita/current

npm run release:production-evidence:run -- \
  --release-id <release-id> \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --api-base-url https://<domain-asli>/api/v1 \
  --frontend-url https://<domain-asli> \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --execute \
  --force
```

Untuk production asli:

- jangan pakai `--skip-system`
- jangan pakai `--skip-network`
- jangan pakai `--skip-db`
- jangan pakai `--allow-incomplete`

## Output Execute

Default output ada di `releases/production-evidence-run`:

| Path | Fungsi |
|---|---|
| `REAL-VPS-EVIDENCE-RUN.md` | Command packet dan input summary |
| `real-vps-evidence-run.json` | Command packet machine-readable |
| `01-live-cutover-qa.log` | Log live cutover QA |
| `02-live-evidence-capture.log` | Log evidence capture |
| `03-remediation-plan.log` | Log remediation plan jika dijalankan |
| `04-operator-review.log` | Log operator evidence review |
| `05-production-signoff.log` | Log production sign-off packet |
| `evidence/GO-NO-GO.md` | Keputusan Go/No-Go operator |
| `review/OPERATOR-EVIDENCE-REVIEW.md` | Keputusan reviewer |
| `signoff/PRODUCTION-SIGNOFF.md` | Keputusan final sign-off |
| `real-vps-evidence-run-result.json` | Ringkasan status execution |

## Decision Rule

| Final status | Arti |
|---|---|
| `SIGNED-OFF` | Production evidence lengkap, review approved, dan sign-off final aman. |
| `SIGN-OFF-WITH-REVIEW` | Tidak ada failed check, tetapi masih ada warning/manual approval. |
| `SIGN-OFF-BLOCKED` | Jangan buka traffic production penuh. Fix blocker dan ulangi evidence run. |

## Intake ke Reviewer

Kirim folder output lengkap ke reviewer:

- `evidence/`
- `review/`
- `remediation/` jika ada
- `signoff/`
- `REAL-VPS-EVIDENCE-RUN.md`
- `real-vps-evidence-run-result.json`

Reviewer hanya boleh memberi approval jika `signoff/PRODUCTION-SIGNOFF.md` berisi `SIGNED-OFF`.

## Review Upload

Setelah operator mengirim folder output, reviewer menjalankan:

```bash
npm run release:production-evidence:upload-review -- \
  --upload-dir /tmp/pharmsita-production-evidence-run \
  --release-id <release-id> \
  --reviewer "<nama-reviewer>" \
  --require-signed-off \
  --force
```

Approval production hanya boleh dilanjutkan jika upload review menghasilkan `APPROVED`.
