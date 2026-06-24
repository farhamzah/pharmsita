# Coordinator Student Directory Production HTTPS Smoke Evidence Review

Tanggal: 2026-06-24
Task: 153
Prioritas: Low
Status: AWAITING OPERATOR OUTPUT

## Tujuan

Dokumen ini dipakai reviewer untuk menilai output operator dari Task 151/152 terkait fitur `Salin link view` pada Coordinator Student Directory di domain production HTTPS.

Saat dokumen ini dibuat, belum ada operator output/domain production evidence yang dilampirkan. Karena itu keputusan review saat ini adalah `PENDING`, bukan `APPROVED`.

## Required Operator Output

Reviewer membutuhkan minimal evidence berikut:

- Domain production aktual.
- Browser dan versi browser.
- User role yang dipakai: koordinator.
- Input monitoring URL.
- Screenshot atau catatan UI state restored:
  - search input;
  - stage chip;
  - page size;
  - sorting header.
- Button feedback setelah klik `Salin link view`.
- Clipboard result yang dipaste.
- Hasil buka ulang shared URL dari clipboard.
- Hasil Back/Forward antar view monitoring.
- Timestamp dan nama operator.

## Review Intake Status

| Evidence | Status | Catatan |
|---|---|---|
| Domain production aktual | Missing | Belum dikirim |
| Browser normal HTTPS | Missing | Belum dikirim |
| User koordinator | Missing | Belum dikirim |
| UI state restored | Missing | Belum dikirim |
| Clipboard result | Missing | Belum dikirim |
| Reopened shared link | Missing | Belum dikirim |
| Back/Forward state sync | Missing | Belum dikirim |
| Operator timestamp | Missing | Belum dikirim |

## Review Rules

### Approve

Reviewer boleh memberi `APPROVED` hanya jika:

- Evidence memakai domain production asli dengan `https://`.
- Clipboard result sama dengan canonical URL production.
- Clipboard result tidak memakai `localhost`, IP internal, `http://`, atau query sementara sebelum hash.
- Shared URL dari clipboard bisa dibuka ulang dan memulihkan state.
- Browser Back/Forward tetap sinkron.
- Tidak ada secret, cookie, token, password, atau isi localStorage dalam evidence.

### Block

Reviewer harus memberi `BLOCKED` jika:

- Evidence belum lengkap.
- Clipboard gagal pada browser normal HTTPS.
- Canonical URL salah domain/protocol.
- Shared URL tidak memulihkan state.
- Reverse proxy menghapus hash route.
- Ada certificate warning atau mixed-content warning.

## Current Review Decision

Decision: `PENDING`

Reason:

Operator output production HTTPS belum tersedia. Local evidence Task 150 membuktikan clipboard success di localhost secure context, tetapi itu belum menggantikan smoke evidence dari domain production asli.

## Reviewer Findings Template

```text
Reviewer:
Reviewed at:
Evidence source:

Finding 1:
Severity:
Evidence:
Decision impact:

Finding 2:
Severity:
Evidence:
Decision impact:

Final decision: APPROVED / BLOCKED / PENDING
Reason:
Required remediation:
```

## Sanitization Checklist

Sebelum evidence disimpan atau dibagikan:

- Hapus token/cookie/password.
- Jangan lampirkan full localStorage/sessionStorage.
- Masking nama user jika bukan akun QA.
- Jangan lampirkan data mahasiswa sensitif selain nama/NIM test yang disetujui.
- Jika screenshot berisi data nyata, pastikan sudah disetujui untuk evidence internal.

## Action Needed

Operator perlu menjalankan checklist:

```text
docs/coordinator-student-directory-share-link-production-https-smoke.md
```

Lalu reviewer mengisi:

```text
docs/coordinator-student-directory-production-https-smoke-signoff.md
```

## Next Task

Task 154: Production Evidence Attachment Intake dan Reviewer Decision Update.

Prioritas: Low

Reason: Task 153 menyiapkan review packet, tetapi belum bisa approve tanpa evidence aktual. Task 154 dijalankan setelah operator mengirim output/screenshot/log production smoke.
