# Production Domain, API Base URL, dan Koordinator Session Intake

Tanggal: 2026-06-24
Task: 157
Prioritas: High
Status: PENDING PRODUCTION INPUT

## Tujuan

Dokumen ini mencatat intake nyata sebelum smoke eksekusi production PharmSITA. Intake ini adalah turunan operasional dari `docs/operator-production-access-intake-smoke-plan.md`.

Scope tetap PharmSITA standalone. Jangan mengambil domain, token, database, atau credential dari Core/Farmasi UBP workspace.

## Intake Summary

| Item | Status | Nilai |
|---|---|---|
| Frontend production URL | Pending | `<belum-diisi>` |
| API production base URL | Pending | `<belum-diisi>` |
| Browser session koordinator | Pending | `<belum-login>` |
| Operator | Pending | `<belum-diisi>` |
| Reviewer | Pending | `<belum-diisi>` |
| Signer/approver | Pending | `<belum-diisi>` |
| Release id | Pending | `<belum-diisi>` |
| Evidence folder | Pending | `<belum-diisi>` |

## Input yang Diperlukan

### 1. Frontend Production URL

Format wajib:

```text
https://<domain-asli>
```

Validasi:

- harus HTTPS;
- bukan `localhost`;
- bukan IP internal;
- bukan `example.ac.id`;
- membuka aplikasi PharmSITA, bukan aplikasi lain.

### 2. API Production Base URL

Format wajib:

```text
https://<domain-asli>/api/v1
```

Validasi:

- harus HTTPS;
- origin harus cocok dengan frontend atau sesuai CORS production;
- response health/readiness bisa dicek tanpa membuka secret;
- tidak boleh memakai URL staging/local kecuali task eksplisit staging.

### 3. Koordinator Session

Opsi paling aman:

1. operator membuka browser normal;
2. operator login manual sebagai role koordinator;
3. setelah dashboard terbuka, QA dilanjutkan dari sesi tersebut.

Jangan menempel password production utama ke chat. Jika harus memakai kredensial tertulis, gunakan akun QA sementara dengan hak minimal dan rotasi password setelah test.

## Browser Smoke Execution Plan

Jalankan setelah URL dan session koordinator siap.

1. Buka frontend production via HTTPS.
2. Pastikan tidak ada certificate warning.
3. Login sebagai koordinator atau pakai session koordinator yang sudah aktif.
4. Buka route:

```text
/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=<nama-atau-nim-valid>&limit=2&sortBy=nim&sortDir=desc
```

5. Pastikan state UI sinkron:

- search terisi sesuai `q`;
- page size sesuai `limit`;
- filter tahap sesuai `stage`;
- sorting header sesuai `sortBy` dan `sortDir`;
- list tidak error.

6. Klik `Salin link view`.
7. Pastikan feedback menjadi `Link tersalin`.
8. Paste clipboard di tempat aman.
9. Pastikan URL hasil clipboard memakai domain production HTTPS dan hash/query tetap utuh.
10. Buka URL hasil clipboard di tab baru.
11. Pastikan view yang sama terbuka lagi.

## VPS Smoke Execution Plan

Jalankan hanya jika operator punya akses VPS dan env production sudah siap.

### Preflight

```bash
cd /var/www/pharmsita/current
npm run backend:check-production-env
npm run db:migrate:status
```

### Evidence Dry Run

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

### Execute

Execute hanya boleh setelah dry-run tidak memiliki `FAIL`.

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
  --execute \
  --force
```

## Evidence yang Harus Disimpan

| Evidence | Required | Status |
|---|---|---|
| Screenshot HTTPS frontend | Yes | Pending |
| Screenshot koordinator logged-in | Yes | Pending |
| Screenshot monitoring state restored | Yes | Pending |
| Screenshot `Link tersalin` | Yes | Pending |
| Clipboard canonical URL | Yes | Pending |
| Screenshot shared URL reopened | Yes | Pending |
| Backend health/readiness result | Yes | Pending |
| Dry-run evidence packet | Yes | Pending |
| Execute evidence packet | Conditional | Pending |

## Decision Gate

| Decision | Kondisi |
|---|---|
| READY TO SMOKE | Domain/API valid dan session koordinator tersedia. |
| READY TO EXECUTE | Dry-run VPS tidak memiliki `FAIL`. |
| GO | Browser smoke PASS dan production evidence `SIGNED-OFF`. |
| BLOCKED | Domain/API/session tidak tersedia, health gagal, atau evidence menunjukkan bug. |
| PENDING | Menunggu input dari operator/user. |

## Current Decision

Decision: `PENDING`

Reason:

Frontend production URL, API base URL, dan session koordinator belum diberikan. Smoke eksekusi belum boleh dijalankan berdasarkan placeholder.

## Operator Fill-In Template

```text
Frontend URL:
API base URL:
Koordinator session: ready / not ready
Operator:
Reviewer:
Signer:
Release id:
Evidence folder:

Browser smoke:
VPS dry-run:
VPS execute:

Decision:
Reason:
Next action:
```

## Report Task 157

Task 157 menetapkan intake nyata untuk domain production, API base URL, dan session koordinator. Status saat dokumen dibuat adalah `PENDING PRODUCTION INPUT`.

## Task Berikutnya

Task 158: Production Browser Smoke Execution untuk Koordinator Session dan Share Link Evidence.

Prioritas: High

Reason: setelah intake terisi, langkah paling dekat adalah menjalankan browser smoke pada domain HTTPS production dengan sesi koordinator dan menyimpan evidence sanitized.

## Task 158 Execution Packet

Dokumen execution/evidence matrix tersedia di:

```text
docs/production-browser-smoke-execution-koordinator-share-link.md
```

Status awal Task 158 tetap `PENDING` sampai input production di dokumen ini terisi.
