# Production Access Input Collection dan First Actual Browser Smoke Run

Tanggal: 2026-06-24
Task: 162
Prioritas: High
Status: BLOCKED WAITING FOR PRODUCTION ACCESS

## Tujuan

Dokumen ini menjadi packet eksekusi pertama untuk mengumpulkan input production dan menjalankan browser smoke aktual role koordinator pada PharmSITA.

Scope tetap PharmSITA standalone. Jangan memakai domain, akun, cookie, token, database, atau artifact dari Core/Farmasi UBP workspace.

## Current Run Status

First actual browser smoke run belum dijalankan.

Reason:

- Frontend production URL belum diberikan.
- API production base URL belum diberikan.
- Browser belum login sebagai koordinator production.
- Sample data mahasiswa untuk search belum dipilih.
- Evidence folder belum ditentukan.

Status ini adalah blocker akses/input, bukan hasil gagal aplikasi.

## Input Collection

Isi bagian ini sebelum smoke dijalankan.

```text
Frontend URL:
API base URL:
Koordinator session: ready / not ready
Sample search keyword:
Operator:
Reviewer:
Release ID:
Evidence folder:
Permission to capture sanitized screenshots: yes / no
```

## Input Safety Rule

Yang boleh diberikan:

- URL frontend production;
- API base URL;
- nama operator/reviewer;
- sample search keyword yang aman untuk evidence;
- konfirmasi bahwa browser sudah login sebagai koordinator.

Yang tidak boleh diberikan:

- password production utama;
- access token, refresh token, cookie, atau localStorage;
- `DATABASE_URL`;
- `AUTH_SECRET`;
- SSH private key;
- screenshot berisi secret.

Opsi paling aman: operator login manual di browser normal, lalu beri tahu bahwa session koordinator sudah aktif.

## Readiness Gate

| Check | Required | Status |
|---|---|---|
| Frontend URL memakai HTTPS | Yes | Missing |
| API base URL memakai HTTPS `/api/v1` | Yes | Missing |
| Browser session koordinator aktif | Yes | Missing |
| Sample search keyword tersedia | Yes | Missing |
| Evidence folder tersedia | Yes | Missing |
| Screenshot sanitized diizinkan | Yes | Missing |

Decision: `BLOCKED WAITING FOR PRODUCTION ACCESS`

## First Smoke Run Steps

Jalankan setelah readiness gate lengkap.

1. Buka frontend production:

```text
https://<domain-asli>
```

2. Verifikasi HTTPS:

- certificate valid;
- tidak ada mixed-content warning;
- tidak dialihkan ke domain lain.

3. Pastikan session role koordinator aktif.

4. Buka URL deep link:

```text
https://<domain-asli>/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=<sample-search>&limit=2&sortBy=nim&sortDir=desc
```

5. Verifikasi state UI:

- route monitoring terbuka;
- search sesuai `q`;
- stage filter sesuai `PROPOSAL_SEMINAR`;
- page size `2`;
- sorting `nim desc`;
- data/list tidak error.

6. Klik `Salin link view`.

7. Verifikasi feedback `Link tersalin`.

8. Paste clipboard ke tempat aman dan pastikan canonical URL:

```text
https://<domain-asli>/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=<sample-search>&limit=2&sortBy=nim&sortDir=desc
```

9. Buka URL clipboard di tab baru.

10. Verifikasi shared URL memulihkan view yang sama.

11. Uji Back/Forward antar dua monitoring URL dan pastikan state tetap sinkron.

## Evidence Output

Simpan evidence sanitized berikut:

| Evidence | Filename | Status |
|---|---|---|
| HTTPS koordinator session | `task162-01-https-koordinator-session.png` | Pending |
| Deep link state restored | `task162-02-state-restored.png` | Pending |
| Link copied feedback | `task162-03-link-copied.png` | Pending |
| Clipboard canonical URL | `task162-04-clipboard-result.txt` | Pending |
| Shared link reopened | `task162-05-shared-link-reopened.png` | Pending |
| Back/Forward sync | `task162-06-back-forward-sync.png` | Pending |
| Operator run note | `task162-run-note.md` | Pending |

## Result Template

```text
Task: 162
Executed at:
Operator:
Frontend URL:
API base URL:
Browser:
Role:
Sample search:
Evidence folder:

HTTPS valid: PASS / FAIL
Koordinator session: PASS / FAIL
Deep link state restored: PASS / FAIL
Share link copied: PASS / FAIL
Clipboard canonical: PASS / FAIL
Shared link reopened: PASS / FAIL
Back/Forward sync: PASS / FAIL
Evidence sanitized: PASS / FAIL

Decision: GO / BLOCKED / PENDING
Reason:
Next action:
```

## Current Result

```text
Task: 162
Executed at: Not executed
Decision: PENDING
Reason: Production URL/API/session koordinator belum tersedia.
Next action: Operator/user harus menyediakan URL production dan membuka session koordinator.
```

## Handoff

Jika Task 162 menghasilkan `GO`, lanjut update:

- `docs/production-smoke-evidence-actual-intake-remediation-task.md`
- `docs/production-browser-smoke-evidence-intake-reviewer-decision.md`
- `docs/production-smoke-evidence-closure-remediation.md`

Jika Task 162 menghasilkan `BLOCKED`, buat remediation task dari finding aktual.

## Report Task 162

Task 162 menetapkan packet input collection dan first actual browser smoke run. Status saat dibuat adalah `BLOCKED WAITING FOR PRODUCTION ACCESS`.

## Task Berikutnya

Task 163: Execute First Actual Browser Smoke Run Setelah Domain dan Session Koordinator Siap.

Prioritas: High

Reason: dokumen eksekusi sudah final. Task berikutnya harus memakai input nyata atau browser yang sudah login, lalu menjalankan smoke aktual dan mengisi evidence.

## Task 163 Attempt

Attempt pertama dicatat di:

```text
docs/production-first-actual-browser-smoke-run-attempt.md
```

Hasil attempt: `BLOCKED INPUT`, karena browser aktif masih localhost dan domain/session production belum tersedia.
