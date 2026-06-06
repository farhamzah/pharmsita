-- PharmSITA Final Project Registration Schema
-- Dialect: PostgreSQL-compatible SQL
-- Depends on:
--   migrations/001_auth_master_data.sql
--   migrations/002_permissions_and_workflow.sql
--   migrations/003_multi_role_first_login.sql

INSERT INTO role_permissions (role, permission)
VALUES
  ('mahasiswa', 'student.final-project-registration.read'),
  ('mahasiswa', 'student.final-project-registration.submit'),
  ('dosen', 'lecturer.final-project-registration.read'),
  ('koordinator', 'coordinator.final-project-registration.read'),
  ('koordinator', 'coordinator.final-project-registration.validate'),
  ('admin', 'admin.final-project-registration.override')
ON CONFLICT (role, permission) DO NOTHING;

CREATE TABLE IF NOT EXISTS final_project_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academic_period_id UUID REFERENCES academic_periods(id) ON DELETE SET NULL,
  requirement_drive_link TEXT NOT NULL DEFAULT '',
  payment_proof_file_ref TEXT,
  payment_proof_link TEXT,
  skema TEXT CHECK (skema IS NULL OR skema IN ('Skripsi', 'Non Skripsi')),
  thesis_type_id UUID REFERENCES thesis_types(id) ON DELETE SET NULL,
  thesis_type_name_snapshot TEXT,
  judul_ta TEXT,
  deskripsi_ta TEXT,
  requested_supervisor1_id UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_supervisor1_name_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (
    status IN ('Draft', 'Menunggu Validasi Koordinator', 'Disetujui', 'Ditolak')
  ),
  coordinator_note TEXT,
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT final_project_registrations_requirement_link_when_submitted CHECK (
    status = 'Draft' OR NULLIF(TRIM(requirement_drive_link), '') IS NOT NULL
  ),
  CONSTRAINT final_project_registrations_rejection_note_required CHECK (
    status <> 'Ditolak' OR NULLIF(TRIM(COALESCE(coordinator_note, '')), '') IS NOT NULL
  ),
  CONSTRAINT final_project_registrations_payment_proof_when_submitted CHECK (
    status = 'Draft'
    OR NULLIF(TRIM(COALESCE(payment_proof_file_ref, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(payment_proof_link, '')), '') IS NOT NULL
  ),
  CONSTRAINT final_project_registrations_content_when_submitted CHECK (
    status = 'Draft'
    OR (
      skema IS NOT NULL
      AND NULLIF(TRIM(COALESCE(thesis_type_name_snapshot, '')), '') IS NOT NULL
      AND NULLIF(TRIM(COALESCE(judul_ta, '')), '') IS NOT NULL
      AND NULLIF(TRIM(COALESCE(deskripsi_ta, '')), '') IS NOT NULL
    )
  ),
  CONSTRAINT final_project_registrations_supervisor_request_when_submitted CHECK (
    status = 'Draft'
    OR requested_supervisor1_id IS NOT NULL
    OR NULLIF(TRIM(COALESCE(requested_supervisor1_name_snapshot, '')), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_final_project_registrations_student_id
  ON final_project_registrations(student_id);

CREATE INDEX IF NOT EXISTS idx_final_project_registrations_status
  ON final_project_registrations(status);

CREATE INDEX IF NOT EXISTS idx_final_project_registrations_academic_period
  ON final_project_registrations(academic_period_id);

CREATE INDEX IF NOT EXISTS idx_final_project_registrations_submitted_at
  ON final_project_registrations(submitted_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_final_project_registrations_one_active_per_student
  ON final_project_registrations(student_id)
  WHERE status IN ('Draft', 'Menunggu Validasi Koordinator', 'Disetujui');

CREATE TABLE IF NOT EXISTS final_project_registration_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES final_project_registrations(id) ON DELETE CASCADE,
  requirement_definition_id UUID REFERENCES requirement_definitions(id) ON DELETE SET NULL,
  requirement_key TEXT,
  label_snapshot TEXT NOT NULL,
  wajib BOOLEAN NOT NULL DEFAULT TRUE,
  file_ref TEXT,
  link_berkas TEXT,
  status TEXT NOT NULL DEFAULT 'Belum Upload' CHECK (
    status IN ('Valid', 'Menunggu Verifikasi', 'Perlu Revisi', 'Belum Upload', 'Ditolak')
  ),
  catatan_mahasiswa TEXT,
  catatan_koordinator TEXT,
  uploaded_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT final_project_registration_requirements_key_present CHECK (
    requirement_definition_id IS NOT NULL OR NULLIF(TRIM(COALESCE(requirement_key, '')), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_final_project_registration_requirements_registration
  ON final_project_registration_requirements(registration_id);

CREATE INDEX IF NOT EXISTS idx_final_project_registration_requirements_status
  ON final_project_registration_requirements(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_final_project_registration_requirements_definition
  ON final_project_registration_requirements(registration_id, requirement_definition_id)
  WHERE requirement_definition_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_final_project_registration_requirements_key
  ON final_project_registration_requirements(registration_id, requirement_key)
  WHERE requirement_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS supervisor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES final_project_registrations(id) ON DELETE CASCADE,
  lecturer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  supervisor_order INTEGER NOT NULL CHECK (supervisor_order IN (1, 2)),
  lecturer_name_snapshot TEXT NOT NULL,
  lecturer_identifier_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  coordinator_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (registration_id, supervisor_order)
);

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_registration
  ON supervisor_assignments(registration_id);

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_lecturer
  ON supervisor_assignments(lecturer_id);

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_status
  ON supervisor_assignments(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_supervisor_assignments_unique_active_lecturer
  ON supervisor_assignments(registration_id, lecturer_id)
  WHERE status = 'Aktif' AND lecturer_id IS NOT NULL;
