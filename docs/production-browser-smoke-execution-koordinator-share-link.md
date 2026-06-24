# Production Browser Smoke Execution untuk Koordinator Session dan Share Link Evidence

Tanggal: 2026-06-24
Task: 158
Prioritas: High
Status: BLOCKED BY MISSING PRODUCTION INPUT

## Tujuan

Dokumen ini mencatat eksekusi smoke browser production untuk session koordinator dan fitur `Salin link view` pada Coordinator Student Directory.

Scope tetap PharmSITA standalone. Jangan memakai domain, akun, cookie, token, atau konfigurasi dari Core/Farmasi UBP workspace.

## Execution Status

Smoke browser production belum dijalankan.

Reason:

- Frontend production URL belum tersedia.
- API production base URL belum tersedia.
- Session koordinator production belum tersedia.
- Evidence folder production belum tersedia.

Status ini bukan bug aplikasi. Status ini adalah blocker operasional sebelum smoke bisa dieksekusi secara sah.

## Required Input dari Task 157

| Input | Required | Status | Catatan |
|---|---|---|---|
| Frontend production URL | Yes | Missing | Harus `https://<domain-asli>`. |
| API production base URL | Yes | Missing | Harus `https://<domain-asli>/api/v1`. |
| Session koordinator | Yes | Missing | Disarankan login manual di browser normal. |
| Nama/NIM sample untuk search | Yes | Missing | Pakai data production yang boleh terlihat di evidence internal. |
| Operator | Yes | Missing | Nama operator test. |
| Evidence folder | Yes | Missing | Folder output screenshot/log sanitized. |

## Browser Execution Checklist

Jalankan checklist ini setelah input lengkap.

1. Buka frontend production:

```text
https://<domain-asli>
```

2. Pastikan browser aman:

- address bar memakai HTTPS;
- tidak ada certificate warning;
- tidak ada mixed-content warning.

3. Login sebagai koordinator atau gunakan session koordinator yang sudah aktif.

4. Buka monitoring deep link:

```text
https://<domain-asli>/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=<nama-atau-nim-valid>&limit=2&sortBy=nim&sortDir=desc
```

5. Verifikasi state UI:

| Check | Expected | Result |
|---|---|---|
| Route | `/kordinator/monitoring` | Pending |
| Search | Sesuai `q` | Pending |
| Stage filter | `PROPOSAL_SEMINAR` | Pending |
| Page size | `2` | Pending |
| Sorting | `nim desc` | Pending |
| Data/list | Tidak error | Pending |

6. Klik tombol `Salin link view`.

7. Verifikasi feedback tombol:

```text
Link tersalin
```

8. Paste clipboard ke tempat aman dan catat canonical URL.

9. Expected clipboard:

```text
https://<domain-asli>/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=<nama-atau-nim-valid>&limit=2&sortBy=nim&sortDir=desc
```

10. Buka URL clipboard di tab baru.

11. Verifikasi tab baru memulihkan state yang sama.

12. Uji Back/Forward antar dua monitoring URL berbeda dan pastikan state tidak tertukar.

## Evidence Capture Matrix

| Evidence | Required | Status | Filename Pattern |
|---|---|---|---|
| HTTPS session koordinator | Yes | Missing | `task158-01-https-session.png` |
| Deep link state restored | Yes | Missing | `task158-02-state-restored.png` |
| Button feedback `Link tersalin` | Yes | Missing | `task158-03-link-copied.png` |
| Clipboard canonical URL | Yes | Missing | `task158-04-clipboard-result.txt` |
| Shared link reopened | Yes | Missing | `task158-05-reopened-shared-link.png` |
| Back/Forward state sync | Yes | Missing | `task158-06-back-forward-sync.png` |
| Browser/operator/timestamp note | Yes | Missing | `task158-review.md` |

## Sanitization Rules

Sebelum evidence disimpan atau dikirim:

- jangan tampilkan password;
- jangan tampilkan token/cookie/localStorage;
- jangan tampilkan `DATABASE_URL`;
- masking data pribadi mahasiswa jika tidak disetujui untuk evidence internal;
- jangan simpan screenshot browser devtools yang memperlihatkan authorization header.

## Execution Result Template

```text
Task: 158
Operator:
Executed at:
Frontend URL:
API base URL:
Browser:
Browser version:
OS:
Role:
Sample query:

HTTPS valid: PASS / FAIL
Koordinator session: PASS / FAIL
Deep link opened: PASS / FAIL
Search restored: PASS / FAIL
Stage restored: PASS / FAIL
Page size restored: PASS / FAIL
Sorting restored: PASS / FAIL
Button feedback: PASS / FAIL
Clipboard canonical URL: PASS / FAIL
Shared link reopened: PASS / FAIL
Back/Forward sync: PASS / FAIL
Evidence sanitized: PASS / FAIL

Decision: GO / BLOCKED / PENDING
Reason:
Next action:
```

## Current Decision

Decision: `PENDING`

Reason:

Task 158 belum bisa dieksekusi karena Task 157 belum menerima frontend production URL, API base URL, dan session koordinator. Eksekusi production smoke tidak boleh memakai placeholder atau domain aplikasi lain.

## Handoff ke Reviewer

Setelah evidence tersedia:

1. Isi `docs/coordinator-student-directory-production-https-smoke-signoff.md`.
2. Lengkapi `docs/coordinator-student-directory-production-evidence-attachment-intake.md`.
3. Update `docs/coordinator-student-directory-production-evidence-review-decision.md` menjadi `APPROVED` atau `BLOCKED`.

## Report Task 158

Task 158 menyiapkan execution packet dan evidence matrix untuk smoke browser production role koordinator. Status saat dibuat adalah `BLOCKED BY MISSING PRODUCTION INPUT`.

## Task Berikutnya

Task 159: Production Evidence Intake dari Browser Smoke Output dan Reviewer GO/BLOCKED Update.

Prioritas: Conditional High

Reason: task berikutnya hanya bisa berjalan setelah operator benar-benar menjalankan browser smoke pada domain HTTPS production dan menyediakan evidence sanitized.

## Task 159 Reviewer Packet

Dokumen intake reviewer tersedia di:

```text
docs/production-browser-smoke-evidence-intake-reviewer-decision.md
```

Status awal tetap `PENDING` sampai output browser smoke production diterima.
