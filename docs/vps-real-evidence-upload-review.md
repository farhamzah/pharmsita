# Real VPS Evidence Upload Review

Dokumen ini dipakai reviewer setelah operator menjalankan `release:production-evidence:run` di VPS/domain asli dan mengirim folder output lengkap.

## Tujuan

Review upload memastikan bukti operator lengkap sebelum production approval:

- runner packet tersedia
- runner result tersedia
- evidence manifest dan `GO-NO-GO.md` tersedia
- operator review tersedia
- production sign-off tersedia
- release ID konsisten
- decision chain konsisten
- tidak ada secret leak di file upload

## Command Reviewer

```bash
npm run release:production-evidence:upload-review -- \
  --upload-dir /tmp/pharmsita-production-evidence-run \
  --release-id <release-id> \
  --reviewer "<nama-reviewer>" \
  --require-signed-off \
  --force
```

Untuk intake awal saat evidence masih blocked:

```bash
npm run release:production-evidence:upload-review -- \
  --upload-dir releases/production-evidence-task113-local \
  --release-id task113-test \
  --reviewer Codex \
  --allow-blocked \
  --force
```

## Struktur Upload Minimal

```text
production-evidence-run/
  REAL-VPS-EVIDENCE-RUN.md
  real-vps-evidence-run.json
  real-vps-evidence-run-result.json
  01-live-cutover-qa.log
  02-live-evidence-capture.log
  03-remediation-plan.log
  04-operator-review.log
  05-production-signoff.log
  evidence/
    GO-NO-GO.md
    evidence-manifest.json
  remediation/
    REMEDIATION.md
    remediation-plan.json
  review/
    OPERATOR-EVIDENCE-REVIEW.md
    operator-evidence-review.json
  signoff/
    PRODUCTION-SIGNOFF.md
    production-signoff-packet.json
    production-signoff-checksums.sha256
```

`remediation/` wajib jika evidence decision bukan `GO`.

## Output Review

| File | Fungsi |
|---|---|
| `REAL-VPS-EVIDENCE-UPLOAD-REVIEW.md` | Review final upload operator |
| `real-vps-evidence-upload-review.json` | Review machine-readable |

## Decision

| Decision | Arti |
|---|---|
| `APPROVED` | Upload lengkap dan final sign-off `SIGNED-OFF`. |
| `NEEDS REVIEW` | Tidak ada failed check, tetapi ada warning. |
| `BLOCKED` | Upload belum bisa jadi dasar approval production. |

## Rule Aman

- `--require-signed-off` wajib untuk approval production.
- Jika review decision `BLOCKED`, jangan buka traffic production penuh.
- Jika secret leak terdeteksi, hapus upload dari storage tidak aman, regenerate evidence dengan redaction, lalu review ulang.
