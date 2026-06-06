-- PharmSITA Demo Master Data Seed
-- Dialect: PostgreSQL-compatible SQL
-- Depends on:
--   migrations/001_auth_master_data.sql

UPDATE academic_periods
SET status = 'Nonaktif', updated_at = NOW()
WHERE status = 'Aktif'
  AND id <> '00000000-0000-4000-8000-000000000101';

INSERT INTO academic_periods (
  id,
  name,
  semester,
  start_date,
  end_date,
  status
)
VALUES (
  '00000000-0000-4000-8000-000000000101',
  '2025/2026',
  'Ganjil',
  '2025-08-01',
  '2026-01-31',
  'Aktif'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  semester = EXCLUDED.semester,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO thesis_types (
  id,
  name,
  skema,
  description,
  status
)
VALUES
  (
    '00000000-0000-4000-8000-000000000201',
    'Penelitian Reguler',
    'Skripsi',
    'Tugas akhir berbasis penelitian laboratorium, klinis, komunitas, atau lapangan.',
    'Aktif'
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    'Studi Pustaka',
    'Skripsi',
    'Tugas akhir berbasis kajian literatur sistematis.',
    'Aktif'
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    'Desain Proyek / Pharmapreneurship',
    'Non Skripsi',
    'Tugas akhir berbasis rancangan proyek, produk, atau kewirausahaan farmasi.',
    'Aktif'
  ),
  (
    '00000000-0000-4000-8000-000000000204',
    'Karya / Publikasi Ilmiah',
    'Non Skripsi',
    'Tugas akhir berbasis karya ilmiah atau publikasi.',
    'Aktif'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  skema = EXCLUDED.skema,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO supporting_documents (
  id,
  name,
  description,
  allowed_types,
  is_required,
  status
)
VALUES
  (
    '00000000-0000-4000-8000-000000000301',
    'Formulir Pendaftaran TA',
    'Formulir pengajuan judul tugas akhir resmi prodi.',
    '["PDF"]'::jsonb,
    'Wajib',
    'Aktif'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    'KRS Semester Berjalan',
    'Bukti KRS aktif semester berjalan yang mencantumkan mata kuliah TA.',
    '["PDF", "Image"]'::jsonb,
    'Wajib',
    'Aktif'
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    'Transkrip Nilai Sementara',
    'Transkrip nilai akademik lengkap untuk syarat kelayakan SKS.',
    '["PDF"]'::jsonb,
    'Wajib',
    'Aktif'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  allowed_types = EXCLUDED.allowed_types,
  is_required = EXCLUDED.is_required,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO requirement_definitions (
  id,
  tahap,
  nama_persyaratan,
  deskripsi_aturan,
  wajib,
  status
)
VALUES
  (
    '00000000-0000-4000-8000-000000000401',
    'Persyaratan Awal',
    'IPK minimal 3.00 dan SKS minimal 120',
    'Divalidasi oleh koordinator sebelum mahasiswa dapat mengajukan TA.',
    TRUE,
    'Aktif'
  ),
  (
    '00000000-0000-4000-8000-000000000402',
    'Persyaratan Awal',
    'Bukti pembayaran TA',
    'Kuitansi atau bukti pembayaran administrasi TA.',
    TRUE,
    'Aktif'
  ),
  (
    '00000000-0000-4000-8000-000000000403',
    'Seminar Proposal',
    'Naskah proposal disetujui pembimbing',
    'Proposal telah melalui bimbingan dan siap dijadwalkan seminar.',
    TRUE,
    'Aktif'
  )
ON CONFLICT (id) DO UPDATE
SET
  tahap = EXCLUDED.tahap,
  nama_persyaratan = EXCLUDED.nama_persyaratan,
  deskripsi_aturan = EXCLUDED.deskripsi_aturan,
  wajib = EXCLUDED.wajib,
  status = EXCLUDED.status,
  updated_at = NOW();
