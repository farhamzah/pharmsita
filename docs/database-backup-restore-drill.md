# Production Database Backup, Restore Drill, dan Migration Gate

Dokumen ini menjadi prosedur keselamatan database sebelum menjalankan migration production PharmSITA.

## Prinsip

- Backup production wajib dibuat sebelum migration.
- Backup harus diverifikasi checksum dan ukuran file.
- Restore drill dilakukan ke database terpisah, bukan database production.
- Migration production hanya boleh jalan setelah pre-migration safety gate `PASS`.
- Connection string tidak ditulis ke log command; script memakai environment `PG*` saat memanggil `pg_dump` dan `pg_restore`.

## PostgreSQL Tooling

Di VPS, pastikan CLI PostgreSQL tersedia:

```bash
npm run db:backup:check-tools
```

Tool wajib:

- `pg_dump`
- `pg_restore`

`psql` direkomendasikan untuk command manual operator.

## Backup Production

Set connection string melalui environment agar tidak masuk shell history:

```bash
export DATABASE_URL='postgres://pharmsita_user:***@127.0.0.1:5432/pharmsita'
export PHARMSITA_BACKUP_DIR='/var/backups/pharmsita/postgres'
```

Buat backup:

```bash
npm run db:backup -- --label pre-migration
```

Output:

```text
/var/backups/pharmsita/postgres/<timestamp>-pre-migration.dump
/var/backups/pharmsita/postgres/<timestamp>-pre-migration.dump.manifest.json
/var/backups/pharmsita/postgres/<timestamp>-pre-migration.dump.sha256
```

Verifikasi backup:

```bash
npm run db:backup:verify -- --manifest /var/backups/pharmsita/postgres/<file>.manifest.json
```

## Restore Drill

Buat database khusus drill, misalnya:

```bash
createdb pharmsita_restore_drill
```

Set target restore:

```bash
export RESTORE_DATABASE_URL='postgres://pharmsita_user:***@127.0.0.1:5432/pharmsita_restore_drill'
```

Jalankan restore drill:

```bash
npm run db:restore:drill -- --manifest /var/backups/pharmsita/postgres/<file>.manifest.json --confirm-restore-drill
```

Safety boundary:

- Script menolak restore ke database source yang sama.
- Nama database target harus mengandung `restore`, `drill`, `scratch`, `tmp`, atau `test`.
- Gunakan `--allow-unsafe-restore-target` hanya jika operator benar-benar sudah menyiapkan database non-production dengan nama berbeda.

Jika sukses, script membuat file:

```text
<backup-file>.<timestamp>.restore-drill.json
```

## Pre-Migration Safety Gate

Gate ringan, hanya butuh backup fresh:

```bash
npm run db:migrate:gate -- --max-age-hours 24
```

Gate ketat, wajib backup fresh dan restore drill:

```bash
npm run db:migrate:gate -- --max-age-hours 24 --require-restore-drill --restore-drill-max-age-hours 168
```

Jika `PASS`, script menulis:

```text
pre-migration-gate-<timestamp>.json
```

Baru setelah itu migration boleh dijalankan:

```bash
npm run db:migrate:status
npm run db:migrate -- --dry-run
npm run db:migrate
```

## Restore Production dari Backup

Restore production hanya untuk insiden dan harus disetujui operator.

Contoh boundary manual:

```bash
sudo systemctl stop pharmsita-backend
pg_restore --clean --if-exists --no-owner --no-acl --dbname pharmsita /var/backups/pharmsita/postgres/<file>.dump
sudo systemctl start pharmsita-backend
npm run deploy:vps:dry-run -- --api-base-url https://pharmsita.example.ac.id/api/v1
```

Sebelum restore production, simpan snapshot database rusak untuk forensik jika memungkinkan.
