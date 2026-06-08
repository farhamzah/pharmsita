# Local PostgreSQL Backup/Restore Drill dan Migration Safety Gate

Tanggal: 2026-06-09  
Task: 128  
Scope: Database lokal PharmSITA di container `pharmsita-postgres`.

## Ringkasan Keputusan

Status Task 128: **PASS**.

Backup lokal berhasil dibuat, checksum berhasil diverifikasi, restore drill berhasil ke database terpisah, dan migration safety gate ketat berhasil PASS dengan syarat restore drill.

## Target Database

| Item | Nilai |
|---|---|
| Source container | `pharmsita-postgres` |
| Source host/port | `localhost:5433` |
| Source database | `pharmsita_local` |
| Source user | `pharmsita_user` |
| Restore drill database | `pharmsita_task128_restore_drill` |
| Backup directory | `E:\Aplikasi\pharmsita\backups\postgres-task128` |

Catatan: backup disimpan di drive E, bukan drive C.

## Tooling Check

Command:

```powershell
npm.cmd run db:backup:check-tools
```

Hasil:

```text
pg_dump    PASS pg_dump (PostgreSQL) 18.0
pg_restore PASS pg_restore (PostgreSQL) 18.0
psql       PASS psql (PostgreSQL) 18.0
```

## Backup

Command:

```powershell
npm.cmd run db:backup -- --label task128-local-pre-migration
```

Output:

```text
backup:
E:\Aplikasi\pharmsita\backups\postgres-task128\20260608T222316Z-task128-local-pre-migration.dump

manifest:
E:\Aplikasi\pharmsita\backups\postgres-task128\20260608T222316Z-task128-local-pre-migration.dump.manifest.json

sha256:
789ac21744d99b859e6cf24e7d7eef1df943c9ab7f3f2204e1d4c9e47510a986

sizeBytes:
156506

publicTables:
35

migrations:
8
```

## Backup Verification

Command:

```powershell
npm.cmd run db:backup:verify -- --manifest E:\Aplikasi\pharmsita\backups\postgres-task128\20260608T222316Z-task128-local-pre-migration.dump.manifest.json
```

Hasil:

```text
backup file exists PASS
backup size        PASS manifest=156506; actual=156506
backup sha256      PASS 789ac21744d99b859e6cf24e7d7eef1df943c9ab7f3f2204e1d4c9e47510a986
```

## Restore Drill

Database drill dibuat ulang:

```powershell
dropdb --if-exists pharmsita_task128_restore_drill
createdb pharmsita_task128_restore_drill
```

Command restore drill:

```powershell
npm.cmd run db:restore:drill -- --manifest E:\Aplikasi\pharmsita\backups\postgres-task128\20260608T222316Z-task128-local-pre-migration.dump.manifest.json --confirm-restore-drill
```

Hasil:

```text
restoreDrill:
E:\Aplikasi\pharmsita\backups\postgres-task128\20260608T222316Z-task128-local-pre-migration.dump.20260608T222458Z.restore-drill.json

status:
PASS

target:
localhost:5433/pharmsita_task128_restore_drill

publicTables:
35

missingTables:
-

restoreWarning:
transaction_timeout ignored after schema PASS
```

Catatan warning:

`pg_dump`/`pg_restore` host adalah PostgreSQL 18.0, sementara container database memakai Postgres/PostGIS 16. `pg_restore` mengeluarkan warning `unrecognized configuration parameter "transaction_timeout"`. Script sudah dihardening agar warning spesifik ini tidak menggagalkan drill jika dan hanya jika schema verification tetap PASS.

## Migration Safety Gate

Command:

```powershell
npm.cmd run db:migrate:gate -- --manifest E:\Aplikasi\pharmsita\backups\postgres-task128\20260608T222316Z-task128-local-pre-migration.dump.manifest.json --max-age-hours 24 --require-restore-drill --restore-drill-max-age-hours 168
```

Hasil:

```text
backup file exists                 PASS
backup size                        PASS
backup sha256                      PASS
backup freshness                   PASS ageHours=0.03; max=24
backup source matches DATABASE_URL PASS
restore drill required             PASS
restore drill freshness            PASS ageHours=0.00; max=168
```

Gate manifest:

```text
E:\Aplikasi\pharmsita\backups\postgres-task128\pre-migration-gate-20260608T222510Z-c421aaa8.json
```

## Post-Drill Verification

Source DB migration status:

```text
Applied: 8; Pending: 0
```

Restore drill DB checks:

```text
public_tables      = 35
applied_migrations = 8
```

## Code Hardening

File updated:

```text
tools/postgres-backup-safety-gate.mjs
```

Change:

1. Added narrow handling for the PostgreSQL 18 to 16 `transaction_timeout` restore warning.
2. Restore drill still requires schema verification PASS.
3. Restore drill manifest now records `restoreWarning`.

Verification:

```powershell
node --check tools\postgres-backup-safety-gate.mjs
```

Result: **PASS**.

## Keputusan Task 128

Task 128: **DONE / PASS**.

Local database safety flow is ready:

1. Backup: **PASS**.
2. Backup verify: **PASS**.
3. Restore drill: **PASS**.
4. Migration safety gate with restore drill: **PASS**.
5. Source migration state after drill: **PASS**.

## Task Berikutnya

### Task 129: Local Release Bundle + Full Local Evidence Packet Setelah DB Safety Gate

Prioritas: **High**

Reason: aplikasi lokal dan database safety gate sudah PASS. Langkah berikutnya adalah membuat release bundle terbaru yang mencakup perubahan Task 124-128, lalu menjalankan evidence packet lokal/staging-mode untuk memastikan artifact, docs, migration, backup gate, dan QA report siap sebelum push/deploy.
