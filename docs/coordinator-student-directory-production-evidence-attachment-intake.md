# Coordinator Student Directory Production Evidence Attachment Intake

Tanggal: 2026-06-24
Task: 154
Prioritas: Low
Status: PENDING ATTACHMENT

## Tujuan

Dokumen ini adalah tempat intake lampiran evidence operator untuk production HTTPS smoke fitur `Salin link view` pada Coordinator Student Directory.

Saat dokumen ini dibuat, belum ada lampiran evidence production yang tersedia di workspace. Karena itu reviewer decision tetap `PENDING`.

## Attachment Checklist

Operator/reviewer perlu mengumpulkan lampiran berikut:

| Attachment | Wajib | Status | Catatan |
|---|---|---|---|
| Screenshot domain HTTPS dan user koordinator | Ya | Missing | Harus terlihat domain production HTTPS, tanpa token/password |
| Screenshot monitoring state restored | Ya | Missing | Search, chip stage, page size, sorting |
| Screenshot/button feedback `Link tersalin` | Ya | Missing | Setelah klik tombol |
| Paste clipboard result | Ya | Missing | Text canonical URL production |
| Screenshot shared URL reopened | Ya | Missing | Tab baru dari clipboard result |
| Back/Forward state sync note/screenshot | Ya | Missing | Dua view monitoring berbeda |
| Browser/version note | Ya | Missing | Edge/Chrome normal |
| Operator timestamp | Ya | Missing | Nama dan waktu test |

## Evidence Naming Convention

Simpan attachment dengan pola:

```text
task154-<release-id>-<domain>-01-https-session.png
task154-<release-id>-<domain>-02-state-restored.png
task154-<release-id>-<domain>-03-link-copied.png
task154-<release-id>-<domain>-04-clipboard-result.txt
task154-<release-id>-<domain>-05-reopened-shared-link.png
task154-<release-id>-<domain>-06-back-forward-sync.png
task154-<release-id>-<domain>-review.md
```

Gunakan domain tanpa karakter khusus, misalnya `pharmsita-example-ac-id`.

## Reviewer Decision Update Form

Isi setelah attachment diterima:

```text
Reviewer:
Reviewed at:
Release ID:
Domain:
Browser:
Evidence folder:

Attachment completeness: PASS / FAIL
HTTPS production domain: PASS / FAIL
UI state restored: PASS / FAIL
Button feedback copied: PASS / FAIL
Clipboard canonical URL: PASS / FAIL
Shared link reopened: PASS / FAIL
Back/Forward sync: PASS / FAIL
Evidence sanitized: PASS / FAIL

Decision: APPROVED / BLOCKED / PENDING
Reason:
Required remediation:
```

## Decision Rules

### APPROVED

Set `APPROVED` hanya jika semua attachment wajib tersedia dan semua checklist reviewer `PASS`.

### BLOCKED

Set `BLOCKED` jika evidence tersedia tetapi menunjukkan masalah, misalnya:

- clipboard memakai domain/protocol salah;
- tombol menampilkan `Gagal salin`;
- shared URL tidak memulihkan state;
- hash route hilang;
- screenshot memperlihatkan certificate/mixed-content warning;
- evidence mengandung secret atau data sensitif yang tidak boleh disimpan.

### PENDING

Set `PENDING` jika:

- attachment belum dikirim;
- attachment belum lengkap;
- reviewer belum melakukan review final.

## Current Decision

Decision: `PENDING`

Reason:

Production HTTPS evidence attachment belum diterima. Dokumen Task 151, 152, dan 153 sudah menyiapkan checklist, sign-off format, dan review packet, tetapi belum ada output operator dari domain production asli.

## Sanitization Gate

Sebelum menyimpan lampiran:

- Masking token/cookie/header authorization.
- Jangan lampirkan password, `.env`, `DATABASE_URL`, refresh token, atau localStorage penuh.
- Jika screenshot memperlihatkan nama/NIM mahasiswa production, pastikan sudah disetujui untuk evidence internal atau lakukan masking.
- Jangan menyimpan clipboard yang berisi token/session URL.

## Handoff ke Task Berikutnya

Task 155: Production HTTPS Evidence Attachment Review dan GO/BLOCKED Decision.

Prioritas: Low

Reason: Task 154 menyiapkan intake attachment. Task 155 baru bisa dijalankan setelah operator mengirim file/screenshot/log evidence production asli.
