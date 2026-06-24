# Coordinator Student Directory Production HTTPS Smoke Evidence Intake dan Sign-Off

Tanggal: 2026-06-24
Task: 152
Prioritas: Low
Status: PENDING EVIDENCE

## Tujuan

Dokumen ini adalah format intake evidence dan sign-off untuk hasil smoke test production HTTPS fitur `Salin link view` pada Coordinator Student Directory.

Task ini tidak mengeksekusi domain production dari workspace lokal. Status final hanya boleh berubah menjadi `APPROVED` setelah operator menjalankan checklist Task 151 pada domain production asli dan mengirim evidence aktual.

## Evidence Intake Form

Isi bagian ini dari hasil operator:

```text
Release ID:
Commit:
Domain production:
Frontend URL:
Browser:
Browser version:
OS:
User role:
Operator:
Reviewer:
Timestamp:

Input monitoring URL:
Expected canonical URL:
Clipboard result:

HTTPS valid: PASS / FAIL
Mixed-content warning: YES / NO
Search state restored: PASS / FAIL
Stage chip restored: PASS / FAIL
Page size restored: PASS / FAIL
Sorting restored: PASS / FAIL
Button feedback: Link tersalin / Gagal salin / Other
Clipboard canonical: PASS / FAIL
Reopened shared link: PASS / FAIL
Back/Forward state sync: PASS / FAIL

Decision: APPROVED / BLOCKED
Reason:
Blocker:
Remediation:
```

## Reviewer Checklist

Reviewer harus memastikan:

- Evidence memakai domain production asli, bukan `localhost`, IP internal, atau placeholder.
- URL memakai `https://`.
- Browser normal dipakai, bukan hanya automation sandbox.
- User role adalah koordinator.
- Clipboard result sama dengan canonical production URL yang diharapkan.
- Clipboard result tidak membawa query sementara sebelum hash.
- Hash route tetap `#/kordinator/monitoring`.
- Query monitoring tetap membawa state yang diuji, misalnya `stage`, `q`, `limit`, `sortBy`, dan `sortDir`.
- Shared URL dibuka ulang dan memulihkan state UI.
- Back/Forward antar view monitoring tidak membuat state lama menempel.
- Tidak ada secret, token, password, cookie, atau isi localStorage yang ditempel ke evidence.

## Sign-Off Decision

### APPROVED

Gunakan status `APPROVED` jika semua kondisi ini terpenuhi:

- HTTPS valid.
- Clipboard success pada browser normal.
- Canonical URL production benar.
- Shared URL bisa dibuka ulang oleh koordinator yang sudah login.
- Tidak ada blocker reverse proxy, mixed-content, atau route hash.

### BLOCKED

Gunakan status `BLOCKED` jika salah satu kondisi ini terjadi:

- Clipboard tetap gagal pada browser normal HTTPS.
- Clipboard berisi `http://`, `localhost`, IP internal, atau domain yang salah.
- Shared URL tidak memulihkan state.
- Route hash hilang setelah reload atau setelah dibuka dari clipboard.
- Ada warning certificate/mixed-content.
- Evidence tidak cukup untuk membuktikan hasil.

## Current Status

Status saat ini: `PENDING EVIDENCE`.

Local evidence yang sudah tersedia:

- Task 150 membuktikan clipboard success pada Microsoft Edge normal di secure context localhost.
- Task 151 menyediakan production HTTPS smoke checklist.

Production evidence yang belum tersedia:

- Domain production aktual.
- Clipboard result dari domain HTTPS production.
- Reopened shared-link evidence dari domain HTTPS production.
- Reviewer decision aktual.

## Sign-Off Table

| Item | Status | Evidence |
|---|---|---|
| Local clipboard success | PASS | `docs/coordinator-student-directory-clipboard-success-qa.md` |
| Production HTTPS checklist ready | PASS | `docs/coordinator-student-directory-share-link-production-https-smoke.md` |
| Production domain smoke executed | PENDING | Awaiting operator evidence |
| Clipboard result production | PENDING | Awaiting operator evidence |
| Reopened shared link production | PENDING | Awaiting operator evidence |
| Reviewer sign-off | PENDING | Awaiting reviewer |

## Reviewer Notes Template

```text
Reviewer:
Reviewed at:
Evidence package:

Findings:
1.
2.
3.

Decision: APPROVED / BLOCKED
Reason:
Required remediation:
```

## Next Task

Task 160: Production Smoke Evidence Closure atau Remediation dari Reviewer Finding.

Prioritas: Conditional High

Reason: setelah reviewer decision tersedia, alur harus bercabang jelas antara closure/sign-off jika `GO` atau remediation jika `BLOCKED`.
