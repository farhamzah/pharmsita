# Audit Export Attempt Retention Policy dan Cleanup Job Planning

Status: policy ditetapkan di Task 77, backend cleanup API/dry-run mulai diimplementasikan di Task 78, UI manual tersedia di Task 79, CLI operator/runbook tersedia di Task 80, scheduler feature flag dengan single-instance guard tersedia di Task 81, dan scheduler status observability tersedia di Task 82.

## Latar Belakang

Task 74-76 menambahkan persistent rate limit guard untuk export CSV audit melalui tabel `audit_export_attempts`, endpoint monitoring admin, dan UI drilldown blocked attempt.

Data attempt ini bersifat operasional, bukan audit utama. Audit utama tetap berada di `audit_logs` melalui event `AUDIT_LOGS_EXPORTED`. Karena attempt bisa bertambah setiap kali admin/koordinator menekan export, tabel ini perlu retention policy agar tidak tumbuh tanpa batas.

## Tujuan

- Menjaga tabel `audit_export_attempts` tetap kecil dan cepat untuk guard window.
- Menyimpan blocked attempt cukup lama untuk investigasi abuse ringan.
- Tidak menghapus event audit utama `AUDIT_LOGS_EXPORTED` dari `audit_logs`.
- Menyiapkan cleanup job yang aman untuk JSON adapter dan PostgreSQL adapter.

## Kebijakan Retensi

Default production yang disarankan:

| Data | Retensi | Reason |
|---|---:|---|
| `audit_export_attempts.allowed = true` | 30 hari | Cukup untuk pola penggunaan export normal dan debugging rate limit. |
| `audit_export_attempts.allowed = false` | 90 hari | Blocked attempt lebih penting untuk investigasi abuse/operasional. |
| `audit_logs` action `AUDIT_LOGS_EXPORTED` | Mengikuti policy audit log utama | Ini event audit resmi, jangan ikut cleanup attempt. |

Default local/dev:

| Data | Retensi |
|---|---:|
| Allowed attempt | 7 hari |
| Blocked attempt | 30 hari |

Environment variable yang disarankan:

```text
AUDIT_EXPORT_ALLOWED_RETENTION_DAYS=30
AUDIT_EXPORT_BLOCKED_RETENTION_DAYS=90
AUDIT_EXPORT_CLEANUP_BATCH_SIZE=1000
AUDIT_EXPORT_CLEANUP_ENABLED=false
```

`AUDIT_EXPORT_CLEANUP_ENABLED` tetap default `false`. Task 80 menyediakan script manual operator, bukan scheduler otomatis.

Task 81 menambahkan scheduler backend optional. Scheduler hanya aktif jika `AUDIT_EXPORT_CLEANUP_ENABLED=true`, memakai in-process overlap guard, dan memakai PostgreSQL advisory lock saat `DB_ADAPTER=postgres`.

## Cleanup Boundary

Tambahkan method repository:

```ts
cleanupExportAttempts(input: {
  allowedBefore: string;
  blockedBefore: string;
  limit: number;
}): Awaitable<{
  deletedAllowed: number;
  deletedBlocked: number;
}>;
```

JSON adapter:

- Filter `state.auditExportAttempts`.
- Hapus allowed attempt dengan `attemptedAt < allowedBefore`.
- Hapus blocked attempt dengan `attemptedAt < blockedBefore`.
- Batasi jumlah delete sampai `limit`.

PostgreSQL adapter:

Gunakan CTE agar delete terbatas batch:

```sql
WITH target AS (
  SELECT id
  FROM audit_export_attempts
  WHERE (
    allowed = TRUE
    AND attempted_at < $1
  ) OR (
    allowed = FALSE
    AND attempted_at < $2
  )
  ORDER BY attempted_at ASC
  LIMIT $3
)
DELETE FROM audit_export_attempts
WHERE id IN (SELECT id FROM target)
RETURNING allowed;
```

Return count dipisah dari rows `RETURNING allowed`.

## Trigger Cleanup

Tahap implementasi yang disarankan:

1. Manual endpoint admin:

```text
POST /api/v1/admin/audit-export-attempts/cleanup
```

Status Task 78: endpoint manual tersedia untuk dry-run dan cleanup eksekusi.

Permission:

```text
audit.read
```

Body optional:

```json
{
  "dryRun": true,
  "allowedRetentionDays": 30,
  "blockedRetentionDays": 90,
  "limit": 1000
}
```

2. CLI script:

```text
npm run audit:cleanup:export-attempts
```

Status Task 80: command tersedia sebagai script manual operator. Default mode adalah dry-run dan execute wajib memakai dua flag eksplisit.

PowerShell dry-run:

```powershell
$env:API_BASE_URL="http://localhost:4000/api/v1"
$env:AUDIT_CLEANUP_ADMIN_IDENTIFIER="admin"
$env:AUDIT_CLEANUP_ADMIN_PASSWORD="demo"
npm.cmd run audit:cleanup:export-attempts
```

PowerShell execute:

```powershell
$env:API_BASE_URL="http://localhost:4000/api/v1"
$env:AUDIT_CLEANUP_ADMIN_IDENTIFIER="admin"
$env:AUDIT_CLEANUP_ADMIN_PASSWORD="demo"
npm.cmd run audit:cleanup:export-attempts -- --execute --confirm-cleanup
```

Override retention dan batch:

```powershell
npm.cmd run audit:cleanup:export-attempts -- --allowed-retention-days 30 --blocked-retention-days 90 --limit 1000
```

Environment script:

| Variable | Default | Catatan |
|---|---:|---|
| `API_BASE_URL` | `http://localhost:4000/api/v1` | Target backend API. |
| `AUDIT_CLEANUP_ADMIN_IDENTIFIER` | `admin` | Akun harus role admin. |
| `AUDIT_CLEANUP_ADMIN_PASSWORD` | `API_SMOKE_PASSWORD` atau `demo` | Jangan simpan password production di repo. |
| `AUDIT_CLEANUP_ALLOWED_RETENTION_DAYS` | `30` | Batas umur allowed attempt. |
| `AUDIT_CLEANUP_BLOCKED_RETENTION_DAYS` | `90` | Batas umur blocked attempt. |
| `AUDIT_CLEANUP_LIMIT` | `1000` | Batch max per eksekusi. |

3. Scheduled job production:

- Default aplikasi tidak menjalankan scheduler.
- Untuk scheduler internal, set `AUDIT_EXPORT_CLEANUP_ENABLED=true`.
- Jalankan interval rendah trafik dengan `AUDIT_EXPORT_CLEANUP_INTERVAL_SECONDS`, default 86400.
- Untuk deployment multi-instance PostgreSQL, semua instance memakai `AUDIT_EXPORT_CLEANUP_ADVISORY_LOCK_KEY` yang sama agar hanya satu cleanup berjalan.
- Untuk deployment JSON/dev, guard hanya in-process sehingga jangan aktifkan scheduler di lebih dari satu proses yang menulis file sama.
- Jangan jalankan execute sebelum hasil dry-run direview.
- Script memanggil API resmi agar RBAC dan audit event tetap aktif.

## Observability

Cleanup harus mencatat audit log:

```text
AUDIT_EXPORT_ATTEMPTS_CLEANED
```

Payload `after`:

```json
{
  "deletedAllowed": 125,
  "deletedBlocked": 3,
  "allowedBefore": "2026-05-08T00:00:00.000Z",
  "blockedBefore": "2026-03-09T00:00:00.000Z",
  "limit": 1000,
  "dryRun": false
}
```

Jika `dryRun=true`, jangan delete data, tapi tetap return estimasi:

```json
{
  "data": {
    "dryRun": true,
    "deletedAllowed": 125,
    "deletedBlocked": 3
  }
}
```

Scheduler status endpoint:

```text
GET /api/v1/admin/audit-export-attempts/cleanup/status
```

Response utama:

```json
{
  "data": {
    "enabled": false,
    "running": false,
    "repositoryMode": "postgres",
    "intervalSeconds": 86400,
    "retention": {
      "allowedDays": 30,
      "blockedDays": 90
    },
    "batchSize": 1000,
    "advisoryLockKey": 810081,
    "startedAt": null,
    "lastStartedAt": null,
    "lastFinishedAt": null,
    "lastResult": null,
    "lastError": null,
    "lastSkip": null
  }
}
```

`lastSkip.reason` bernilai `already-running` atau `advisory-lock-held`.

## UI Boundary

Tambahkan di panel `Monitoring Export Audit`:

- Tombol `Cleanup`.
- Dialog konfirmasi dengan ringkasan retention.
- Toggle `Dry run`.
- Result banner setelah cleanup/dry-run.

Jangan otomatis cleanup saat halaman dibuka.

## QA Minimum

API smoke:

- Seed allowed attempt lama.
- Seed blocked attempt lama.
- Seed attempt baru.
- Dry run mengembalikan estimasi tanpa delete.
- Cleanup menghapus hanya attempt melewati retention.
- Attempt baru tetap ada.
- Audit log `AUDIT_EXPORT_ATTEMPTS_CLEANED` tercatat.
- Non-admin ditolak `403`.

UI QA:

- Admin membuka panel monitoring.
- Admin membuka dialog cleanup.
- Dry run menampilkan estimasi.
- Cleanup menampilkan result banner.
- Monitoring list refresh setelah cleanup.

## Risiko dan Keputusan

- Jangan cleanup `audit_logs` dalam task ini. Retensi audit utama perlu kebijakan terpisah.
- Jangan menjalankan cleanup otomatis sebelum ada operational runbook.
- Retensi blocked lebih panjang karena blocked attempt merupakan sinyal abuse yang paling bernilai.
- Batch delete wajib agar cleanup tidak mengunci tabel terlalu lama.

## Task Implementasi Lanjutan

Task berikutnya yang disarankan:

**Task 78: Audit Export Attempt Cleanup Repository/API dan Dry Run Contract**

Prioritas: Medium.

Reason: planning sudah menetapkan policy. Langkah berikutnya adalah implementasi backend cleanup yang aman, masih tanpa scheduler otomatis.
