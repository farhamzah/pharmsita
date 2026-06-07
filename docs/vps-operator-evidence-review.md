# VPS Operator Evidence Review Loop

Dokumen ini menutup loop real VPS cutover: operator menjalankan command di VPS/domain asli, lalu reviewer memeriksa folder evidence dan remediation sebelum traffic production dibuka penuh.

## Tujuan

Review loop memastikan output operator lengkap dan dapat dipercaya:

- `GO-NO-GO.md` ada
- `evidence-manifest.json` ada
- checksum file evidence cocok dengan manifest
- file bukti wajib tersedia
- tidak ada password/token yang bocor di report
- jika decision bukan `GO`, `REMEDIATION.md` dan `remediation-plan.json` ikut disediakan
- reviewer memberi keputusan `APPROVED`, `NEEDS REVIEW`, atau `BLOCKED`

## Command di VPS

Operator menjalankan ini di VPS/domain asli:

```bash
cd /var/www/pharmsita/current

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
  --work-dir /tmp/pharmsita-live-evidence \
  --force
```

Jika decision bukan `GO`:

```bash
npm run release:go-no-go:remediate -- \
  --evidence-dir /tmp/pharmsita-live-evidence \
  --output-dir /tmp/pharmsita-remediation \
  --operator "<nama-operator>" \
  --force
```

## Paket Yang Dikirim Operator

Minimal folder/file:

```text
/tmp/pharmsita-live-evidence/
  GO-NO-GO.md
  evidence-manifest.json
  artifact-evidence.txt
  current-symlink.txt
  live-cutover-qa-command.txt
  raw-nginx-test.txt
  raw-systemctl-is-active.txt
  raw-systemctl-status.txt
  raw-journalctl-tail.txt
  raw-http-health.json
  raw-http-ready.json
  raw-http-frontend.json
  live-qa/

/tmp/pharmsita-remediation/
  REMEDIATION.md
  remediation-plan.json
```

Remediation folder wajib jika `GO-NO-GO.md` bukan `GO`.

## Review Command

Di mesin review atau di VPS:

```bash
npm run release:operator-evidence:review -- \
  --evidence-dir /tmp/pharmsita-live-evidence \
  --remediation-dir /tmp/pharmsita-remediation \
  --expected-release <release-id> \
  --reviewer "<nama-reviewer>" \
  --operator "<nama-operator>" \
  --require-go \
  --force
```

Untuk intake awal saat evidence masih `INCOMPLETE`, gunakan:

```bash
npm run release:operator-evidence:review -- \
  --evidence-dir /tmp/pharmsita-live-evidence \
  --remediation-dir /tmp/pharmsita-remediation \
  --allow-incomplete \
  --force
```

## Output Review

| File | Fungsi |
|---|---|
| `OPERATOR-EVIDENCE-REVIEW.md` | Keputusan reviewer dan daftar check |
| `operator-evidence-review.json` | Review machine-readable |

Jika decision `APPROVED`, lanjutkan dengan production sign-off packet:

```bash
npm run release:production-signoff:packet -- \
  --evidence-dir /tmp/pharmsita-live-evidence \
  --review-dir /tmp/pharmsita-review \
  --remediation-dir /tmp/pharmsita-remediation \
  --release-id <release-id> \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --require-approved \
  --force
```

## Decision

| Decision | Arti |
|---|---|
| `APPROVED` | Evidence GO, lengkap, checksum valid, dan tidak ada secret leak. |
| `NEEDS REVIEW` | Tidak ada blocker fatal, tetapi ada warning/sign-off. |
| `BLOCKED` | Ada `FAIL`, evidence kurang, secret leak, decision bukan GO saat `--require-go`, atau remediation wajib belum ada. |

## Review Loop

1. Operator capture evidence di VPS/domain asli.
2. Jika bukan `GO`, operator jalankan remediation planner.
3. Reviewer menjalankan `release:operator-evidence:review`.
4. Jika `BLOCKED`, operator memperbaiki issue dan capture ulang evidence.
5. Jika `APPROVED`, jalankan `release:production-signoff:packet`.
6. Lampirkan `GO-NO-GO.md`, `evidence-manifest.json`, `REMEDIATION.md` bila ada, `OPERATOR-EVIDENCE-REVIEW.md`, dan `PRODUCTION-SIGNOFF.md` ke catatan release.
