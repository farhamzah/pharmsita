-- PharmSITA Role-Specific Profile Field Completeness

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS skema_ta TEXT CHECK (skema_ta IN ('Skripsi', 'Non Skripsi')),
  ADD COLUMN IF NOT EXISTS jenis_ta TEXT;

ALTER TABLE lecturer_profiles
  ADD COLUMN IF NOT EXISTS program_studi TEXT,
  ADD COLUMN IF NOT EXISTS jabatan_akademik TEXT,
  ADD COLUMN IF NOT EXISTS peran_sistem JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE coordinator_profiles
  ADD COLUMN IF NOT EXISTS jabatan TEXT,
  ADD COLUMN IF NOT EXISTS program_studi TEXT,
  ADD COLUMN IF NOT EXISTS hak_akses_utama JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE admin_profiles
  ADD COLUMN IF NOT EXISTS divisi TEXT,
  ADD COLUMN IF NOT EXISTS tingkat_akses TEXT CHECK (tingkat_akses IN ('Superadmin', 'Admin Prodi')),
  ADD COLUMN IF NOT EXISTS cakupan_akses JSONB NOT NULL DEFAULT '[]'::JSONB;
