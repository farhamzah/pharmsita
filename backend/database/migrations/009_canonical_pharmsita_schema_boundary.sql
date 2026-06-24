-- PharmSITA Canonical Schema Boundary
-- Dialect: PostgreSQL-compatible SQL
-- Depends on:
--   migrations/001_auth_master_data.sql
--   migrations/002_permissions_and_workflow.sql
--   migrations/003_multi_role_first_login.sql
--   migrations/004_final_project_registration.sql
--   migrations/005_guidance_type_materials.sql
--   migrations/006_audit_export_guard.sql
--   migrations/007_user_profile_contact.sql
--   migrations/008_role_profile_fields.sql
--
-- This migration is intentionally additive. It introduces the canonical
-- PharmSITA schema from the detail database reference while preserving
-- existing runtime tables that are already used by the frontend/backend.

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_code_not_blank CHECK (TRIM(code) <> ''),
  CONSTRAINT roles_name_not_blank CHECK (TRIM(name) <> '')
);

INSERT INTO roles (code, name)
VALUES
  ('mahasiswa', 'Mahasiswa'),
  ('dosen', 'Dosen'),
  ('koordinator', 'Koordinator TA'),
  ('admin', 'Admin'),
  ('pimpinan', 'Pimpinan')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT faculties_code_not_blank CHECK (TRIM(code) <> ''),
  CONSTRAINT faculties_name_not_blank CHECK (TRIM(name) <> '')
);

INSERT INTO faculties (code, name, is_active)
VALUES ('FARMASI', 'Fakultas Farmasi', TRUE)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS study_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT study_programs_code_not_blank CHECK (TRIM(code) <> ''),
  CONSTRAINT study_programs_name_not_blank CHECK (TRIM(name) <> '')
);

INSERT INTO study_programs (faculty_id, code, name, is_active)
SELECT id, 'FARMASI_S1', 'Farmasi S1', TRUE
FROM faculties
WHERE code = 'FARMASI'
ON CONFLICT (code) DO UPDATE
SET
  faculty_id = EXCLUDED.faculty_id,
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS study_program_id UUID,
  ADD COLUMN IF NOT EXISTS first_login BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE users
SET username = COALESCE(NULLIF(TRIM(username), ''), identifier)
WHERE identifier IS NOT NULL;

UPDATE users
SET full_name = COALESCE(NULLIF(TRIM(full_name), ''), name)
WHERE name IS NOT NULL;

UPDATE users
SET
  first_login = first_login_completed_at IS NULL OR force_change_on_login = TRUE,
  is_active = status = 'Aktif';

UPDATE users u
SET study_program_id = sp.id
FROM student_profiles profile
JOIN study_programs sp
  ON LOWER(sp.name) = LOWER(profile.program_studi)
WHERE profile.user_id = u.id
  AND u.study_program_id IS NULL
  AND NULLIF(TRIM(COALESCE(profile.program_studi, '')), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
  ON users(LOWER(username))
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_study_program_id
  ON users(study_program_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_study_program_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_study_program_id_fkey
      FOREIGN KEY (study_program_id) REFERENCES study_programs(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS id UUID,
  ADD COLUMN IF NOT EXISTS role_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

UPDATE user_roles
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE user_roles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE user_roles ur
SET
  role_id = r.id,
  assigned_at = COALESCE(ur.assigned_at, ur.created_at, NOW())
FROM roles r
WHERE r.code = ur.role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_id
  ON user_roles(id)
  WHERE id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id
  ON user_roles(role_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role_id
  ON user_roles(user_id, role_id)
  WHERE role_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_role_id_fkey'
  ) THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT user_roles_role_id_fkey
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_title_not_blank CHECK (TRIM(title) <> '')
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT system_settings_key_not_blank CHECK (TRIM(key) <> '')
);

INSERT INTO system_settings (key, value)
VALUES
  ('DEFAULT_SUPERVISOR_1_QUOTA', '5'),
  ('DEFAULT_SUPERVISOR_2_QUOTA', '5')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS thesis_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT thesis_schemes_code_not_blank CHECK (TRIM(code) <> ''),
  CONSTRAINT thesis_schemes_name_not_blank CHECK (TRIM(name) <> '')
);

INSERT INTO thesis_schemes (code, name, is_active)
VALUES
  ('SKRIPSI', 'Skripsi', TRUE),
  ('NON_SKRIPSI', 'Non Skripsi', TRUE)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

ALTER TABLE thesis_types
  ADD COLUMN IF NOT EXISTS scheme_id UUID,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE thesis_types tt
SET
  scheme_id = ts.id,
  is_active = tt.status = 'Aktif'
FROM thesis_schemes ts
WHERE (
    (tt.skema = 'Skripsi' AND ts.code = 'SKRIPSI')
    OR (tt.skema = 'Non Skripsi' AND ts.code = 'NON_SKRIPSI')
  )
  AND tt.scheme_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_thesis_types_scheme_id
  ON thesis_types(scheme_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_thesis_types_name_scheme
  ON thesis_types(LOWER(name), scheme_id)
  WHERE scheme_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'thesis_types_scheme_id_fkey'
  ) THEN
    ALTER TABLE thesis_types
      ADD CONSTRAINT thesis_types_scheme_id_fkey
      FOREIGN KEY (scheme_id) REFERENCES thesis_schemes(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE academic_periods
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE academic_periods
SET
  code = COALESCE(NULLIF(TRIM(code), ''), 'PERIODE_' || LEFT(REPLACE(id::TEXT, '-', ''), 12)),
  is_active = status = 'Aktif';

CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_periods_code_lower
  ON academic_periods(LOWER(code))
  WHERE code IS NOT NULL;

CREATE TABLE IF NOT EXISTS requirement_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT requirement_categories_code_not_blank CHECK (TRIM(code) <> ''),
  CONSTRAINT requirement_categories_name_not_blank CHECK (TRIM(name) <> '')
);

INSERT INTO requirement_categories (code, name, is_active)
VALUES
  ('PERSYARATAN_AWAL', 'Persyaratan Awal', TRUE),
  ('SEMINAR_PROPOSAL', 'Seminar Proposal', TRUE),
  ('SIDANG_AKHIR', 'Sidang Akhir', TRUE),
  ('YUDISIUM', 'Yudisium', TRUE)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES requirement_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT requirements_name_not_blank CHECK (TRIM(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_requirements_category_name
  ON requirements(category_id, LOWER(name));

INSERT INTO requirements (id, category_id, name, is_required, is_active, created_at)
SELECT
  rd.id,
  rc.id,
  rd.nama_persyaratan,
  rd.wajib,
  rd.status = 'Aktif',
  COALESCE(rd.created_at, NOW())
FROM requirement_definitions rd
JOIN requirement_categories rc
  ON rc.code = CASE rd.tahap
    WHEN 'Persyaratan Awal' THEN 'PERSYARATAN_AWAL'
    WHEN 'Seminar Proposal' THEN 'SEMINAR_PROPOSAL'
    WHEN 'Sidang Akhir' THEN 'SIDANG_AKHIR'
    WHEN 'Yudisium' THEN 'YUDISIUM'
    ELSE 'PERSYARATAN_AWAL'
  END
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS thesis_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  legacy_step_id TEXT UNIQUE,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT thesis_stages_code_not_blank CHECK (TRIM(code) <> ''),
  CONSTRAINT thesis_stages_name_not_blank CHECK (TRIM(name) <> '')
);

INSERT INTO thesis_stages (code, name, legacy_step_id, sort_order, is_active)
VALUES
  ('PROPOSAL_GUIDANCE', 'Bimbingan Proposal', 'bimbingan-pra-proposal', 10, TRUE),
  ('PROPOSAL_SEMINAR', 'Seminar Proposal', 'sidang-proposal', 20, TRUE),
  ('PROPOSAL_REVISION', 'Revisi Proposal', 'revisi-proposal', 30, TRUE),
  ('FINAL_GUIDANCE', 'Bimbingan Akhir', 'bimbingan-pra-sidang', 40, TRUE),
  ('FINAL_DEFENSE', 'Sidang Akhir', 'sidang', 50, TRUE),
  ('FINAL_REVISION', 'Revisi Sidang Akhir', 'revisi-sidang', 60, TRUE),
  ('COMPLETED', 'Selesai', NULL, 70, TRUE)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  legacy_step_id = COALESCE(thesis_stages.legacy_step_id, EXCLUDED.legacy_step_id),
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS thesis_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_final_project_registration_id UUID UNIQUE REFERENCES final_project_registrations(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academic_period_id UUID REFERENCES academic_periods(id) ON DELETE SET NULL,
  thesis_type_id UUID REFERENCES thesis_types(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  title_description TEXT,
  requirement_drive_link TEXT,
  payment_proof_file_url TEXT,
  recommended_supervisor_1_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
  ),
  validation_note TEXT,
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT thesis_registrations_title_when_submitted CHECK (
    status = 'DRAFT' OR NULLIF(TRIM(title), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_thesis_registrations_student_id
  ON thesis_registrations(student_id);

CREATE INDEX IF NOT EXISTS idx_thesis_registrations_status
  ON thesis_registrations(status);

CREATE INDEX IF NOT EXISTS idx_thesis_registrations_period
  ON thesis_registrations(academic_period_id);

INSERT INTO thesis_registrations (
  id,
  legacy_final_project_registration_id,
  student_id,
  academic_period_id,
  thesis_type_id,
  title,
  title_description,
  requirement_drive_link,
  payment_proof_file_url,
  recommended_supervisor_1_id,
  status,
  validation_note,
  submitted_at,
  validated_at,
  validated_by,
  created_at,
  updated_at,
  updated_by
)
SELECT
  fpr.id,
  fpr.id,
  fpr.student_id,
  fpr.academic_period_id,
  fpr.thesis_type_id,
  COALESCE(fpr.judul_ta, ''),
  fpr.deskripsi_ta,
  fpr.requirement_drive_link,
  COALESCE(NULLIF(TRIM(COALESCE(fpr.payment_proof_link, '')), ''), fpr.payment_proof_file_ref),
  fpr.requested_supervisor1_id,
  CASE fpr.status
    WHEN 'Draft' THEN 'DRAFT'
    WHEN 'Menunggu Validasi Koordinator' THEN 'PENDING'
    WHEN 'Disetujui' THEN 'APPROVED'
    WHEN 'Ditolak' THEN 'REJECTED'
    ELSE 'PENDING'
  END,
  fpr.coordinator_note,
  fpr.submitted_at,
  fpr.validated_at,
  fpr.validated_by,
  COALESCE(fpr.created_at, NOW()),
  fpr.updated_at,
  fpr.updated_by
FROM final_project_registrations fpr
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS theses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL UNIQUE REFERENCES thesis_registrations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
  ),
  current_stage_id UUID REFERENCES thesis_stages(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_theses_student_id
  ON theses(student_id);

CREATE INDEX IF NOT EXISTS idx_theses_current_stage_id
  ON theses(current_stage_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_theses_one_active_per_student
  ON theses(student_id)
  WHERE status IN ('ACTIVE', 'IN_PROGRESS');

INSERT INTO theses (
  registration_id,
  student_id,
  title,
  status,
  current_stage_id,
  started_at,
  created_at,
  updated_at,
  updated_by
)
SELECT
  tr.id,
  tr.student_id,
  tr.title,
  'ACTIVE',
  ts.id,
  COALESCE(tr.validated_at, tr.submitted_at, tr.created_at, NOW()),
  COALESCE(tr.validated_at, tr.created_at, NOW()),
  tr.updated_at,
  tr.updated_by
FROM thesis_registrations tr
CROSS JOIN thesis_stages ts
WHERE tr.status = 'APPROVED'
  AND ts.code = 'PROPOSAL_GUIDANCE'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS thesis_stage_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES thesis_stages(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'SKIPPED')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thesis_stage_histories_thesis
  ON thesis_stage_histories(thesis_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_thesis_stage_histories_stage
  ON thesis_stage_histories(stage_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_thesis_stage_histories_one_active
  ON thesis_stage_histories(thesis_id, stage_id)
  WHERE finished_at IS NULL;

INSERT INTO thesis_stage_histories (thesis_id, stage_id, status, started_at, created_at)
SELECT
  t.id,
  t.current_stage_id,
  'ACTIVE',
  COALESCE(t.started_at, t.created_at, NOW()),
  COALESCE(t.created_at, NOW())
FROM theses t
WHERE t.current_stage_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM thesis_stage_histories history
    WHERE history.thesis_id = t.id
      AND history.stage_id = t.current_stage_id
      AND history.finished_at IS NULL
  );

CREATE TABLE IF NOT EXISTS thesis_committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('SUPERVISOR_1', 'SUPERVISOR_2')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (thesis_id, role)
);

CREATE INDEX IF NOT EXISTS idx_thesis_committees_lecturer
  ON thesis_committees(lecturer_id, role);

INSERT INTO thesis_committees (
  thesis_id,
  lecturer_id,
  role,
  assigned_at,
  assigned_by,
  created_at
)
SELECT
  t.id,
  sa.lecturer_id,
  CASE sa.supervisor_order
    WHEN 1 THEN 'SUPERVISOR_1'
    ELSE 'SUPERVISOR_2'
  END,
  COALESCE(sa.assigned_at, sa.created_at, NOW()),
  sa.assigned_by,
  COALESCE(sa.created_at, NOW())
FROM supervisor_assignments sa
JOIN thesis_registrations tr
  ON tr.legacy_final_project_registration_id = sa.registration_id
JOIN theses t
  ON t.registration_id = tr.id
WHERE sa.lecturer_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS lecturer_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  supervisor_1_quota INTEGER NOT NULL DEFAULT 5 CHECK (supervisor_1_quota >= 0),
  supervisor_2_quota INTEGER NOT NULL DEFAULT 5 CHECK (supervisor_2_quota >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

INSERT INTO lecturer_quotas (lecturer_id, supervisor_1_quota, supervisor_2_quota, created_at)
SELECT
  lp.user_id,
  GREATEST(COALESCE(lp.quota_limit, 5), 0),
  GREATEST(COALESCE(lp.quota_limit, 5), 0),
  COALESCE(lp.created_at, NOW())
FROM lecturer_profiles lp
ON CONFLICT (lecturer_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS guidance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_guidance_workflow_id UUID UNIQUE REFERENCES guidance_workflows(id) ON DELETE SET NULL,
  thesis_id UUID REFERENCES theses(id) ON DELETE SET NULL,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  thesis_stage_id UUID NOT NULL REFERENCES thesis_stages(id) ON DELETE RESTRICT,
  document_link TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')
  ),
  validate_note TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_guidance_requests_thesis
  ON guidance_requests(thesis_id);

CREATE INDEX IF NOT EXISTS idx_guidance_requests_submitted_by
  ON guidance_requests(submitted_by);

CREATE INDEX IF NOT EXISTS idx_guidance_requests_stage_status
  ON guidance_requests(thesis_stage_id, status);

INSERT INTO guidance_requests (
  id,
  legacy_guidance_workflow_id,
  thesis_id,
  submitted_by,
  approved_by,
  thesis_stage_id,
  document_link,
  status,
  validate_note,
  submitted_at,
  approved_at,
  created_at,
  updated_at,
  updated_by
)
SELECT
  gw.id,
  gw.id,
  t.id,
  gw.student_id,
  gw.validated_by,
  ts.id,
  COALESCE(gw.google_docs_link, ''),
  CASE gw.request_status
    WHEN 'Draft' THEN 'DRAFT'
    WHEN 'Menunggu Validasi Dosen' THEN 'PENDING'
    WHEN 'Disetujui' THEN 'APPROVED'
    WHEN 'Ditolak' THEN 'REJECTED'
    ELSE CASE gw.guidance_status
      WHEN 'requested' THEN 'PENDING'
      WHEN 'approved' THEN 'APPROVED'
      ELSE 'DRAFT'
    END
  END,
  COALESCE(gw.lecturer_note, gw.guidance_approval_note, gw.guidance_note),
  gw.guidance_requested_at,
  COALESCE(gw.validated_at, gw.guidance_approved_at),
  COALESCE(gw.created_at, NOW()),
  gw.updated_at,
  gw.updated_by
FROM guidance_workflows gw
JOIN thesis_stages ts
  ON ts.legacy_step_id = gw.stage_id
LEFT JOIN theses t
  ON t.student_id = gw.student_id
  AND t.status IN ('ACTIVE', 'IN_PROGRESS')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS stage_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_exam_id UUID UNIQUE REFERENCES exams(id) ON DELETE SET NULL,
  legacy_revision_workflow_id UUID UNIQUE REFERENCES revision_workflows(id) ON DELETE SET NULL,
  thesis_id UUID REFERENCES theses(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thesis_stage_id UUID NOT NULL REFERENCES thesis_stages(id) ON DELETE RESTRICT,
  requirement_drive_link TEXT,
  latest_document_file TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SCHEDULED', 'COMPLETED')
  ),
  validation_note TEXT,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stage_submissions_thesis
  ON stage_submissions(thesis_id);

CREATE INDEX IF NOT EXISTS idx_stage_submissions_student_stage
  ON stage_submissions(student_id, thesis_stage_id);

CREATE INDEX IF NOT EXISTS idx_stage_submissions_status
  ON stage_submissions(status);

INSERT INTO stage_submissions (
  id,
  legacy_exam_id,
  thesis_id,
  student_id,
  thesis_stage_id,
  requirement_drive_link,
  status,
  submitted_at,
  created_at,
  updated_at,
  updated_by
)
SELECT
  e.id,
  e.id,
  t.id,
  e.student_id,
  ts.id,
  e.google_docs_link,
  CASE e.status
    WHEN 'belum-daftar' THEN 'DRAFT'
    WHEN 'menunggu-jadwal' THEN 'PENDING'
    WHEN 'terjadwal' THEN 'SCHEDULED'
    WHEN 'selesai' THEN 'COMPLETED'
    ELSE 'PENDING'
  END,
  e.submitted_at,
  COALESCE(e.created_at, NOW()),
  e.updated_at,
  e.updated_by
FROM exams e
JOIN thesis_stages ts
  ON ts.legacy_step_id = e.stage_id
LEFT JOIN theses t
  ON t.student_id = e.student_id
  AND t.status IN ('ACTIVE', 'IN_PROGRESS')
ON CONFLICT DO NOTHING;

INSERT INTO stage_submissions (
  id,
  legacy_revision_workflow_id,
  thesis_id,
  student_id,
  thesis_stage_id,
  latest_document_file,
  status,
  validation_note,
  submitted_at,
  created_at,
  updated_at,
  updated_by
)
SELECT
  rw.id,
  rw.id,
  t.id,
  rw.student_id,
  ts.id,
  rw.final_file_ref,
  CASE
    WHEN rw.ketua_sidang_status = 'approved' THEN 'APPROVED'
    WHEN rw.ketua_sidang_status = 'rejected' THEN 'REJECTED'
    WHEN rw.submitted_at IS NOT NULL THEN 'PENDING'
    ELSE 'DRAFT'
  END,
  NULL,
  rw.submitted_at,
  COALESCE(rw.created_at, NOW()),
  rw.updated_at,
  rw.updated_by
FROM revision_workflows rw
JOIN thesis_stages ts
  ON ts.legacy_step_id = rw.stage_id
LEFT JOIN theses t
  ON t.student_id = rw.student_id
  AND t.status IN ('ACTIVE', 'IN_PROGRESS')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS stage_submission_requirement_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_submission_id UUID NOT NULL REFERENCES stage_submissions(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stage_submission_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_submission_requirement_validations_requirement
  ON stage_submission_requirement_validations(requirement_id);

CREATE TABLE IF NOT EXISTS thesis_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_exam_id UUID UNIQUE REFERENCES exams(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thesis_id UUID REFERENCES theses(id) ON DELETE SET NULL,
  thesis_stage_id UUID NOT NULL REFERENCES thesis_stages(id) ON DELETE RESTRICT,
  room TEXT,
  location TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT thesis_schedules_time_order CHECK (
    start_time IS NULL OR end_time IS NULL OR end_time > start_time
  )
);

CREATE INDEX IF NOT EXISTS idx_thesis_schedules_student
  ON thesis_schedules(student_id, start_time);

CREATE INDEX IF NOT EXISTS idx_thesis_schedules_stage
  ON thesis_schedules(thesis_stage_id, start_time);

CREATE INDEX IF NOT EXISTS idx_thesis_schedules_room_time
  ON thesis_schedules(room, start_time, end_time)
  WHERE room IS NOT NULL;

INSERT INTO thesis_schedules (
  id,
  legacy_exam_id,
  student_id,
  thesis_id,
  thesis_stage_id,
  room,
  location,
  start_time,
  end_time,
  created_by,
  created_at,
  updated_at,
  updated_by
)
SELECT
  e.id,
  e.id,
  e.student_id,
  t.id,
  ts.id,
  e.schedule_room,
  e.schedule_location,
  CASE
    WHEN e.schedule_date IS NOT NULL AND e.schedule_start_time IS NOT NULL
      THEN e.schedule_date + e.schedule_start_time
    ELSE NULL
  END,
  CASE
    WHEN e.schedule_date IS NOT NULL AND e.schedule_end_time IS NOT NULL
      THEN e.schedule_date + e.schedule_end_time
    ELSE NULL
  END,
  e.updated_by,
  COALESCE(e.created_at, NOW()),
  e.updated_at,
  e.updated_by
FROM exams e
JOIN thesis_stages ts
  ON ts.legacy_step_id = e.stage_id
LEFT JOIN theses t
  ON t.student_id = e.student_id
  AND t.status IN ('ACTIVE', 'IN_PROGRESS')
WHERE e.schedule_date IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS thesis_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES thesis_schedules(id) ON DELETE CASCADE,
  examiner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('CHAIRMAN', 'EXAMINER_1', 'EXAMINER_2')),
  presentation_score NUMERIC(5, 2) CHECK (presentation_score IS NULL OR presentation_score BETWEEN 0 AND 100),
  writing_score NUMERIC(5, 2) CHECK (writing_score IS NULL OR writing_score BETWEEN 0 AND 100),
  qa_score NUMERIC(5, 2) CHECK (qa_score IS NULL OR qa_score BETWEEN 0 AND 100),
  total_score NUMERIC(5, 2) CHECK (total_score IS NULL OR total_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (schedule_id, examiner_id)
);

CREATE INDEX IF NOT EXISTS idx_thesis_assessments_examiner
  ON thesis_assessments(examiner_id);

INSERT INTO thesis_assessments (
  schedule_id,
  examiner_id,
  role,
  created_at,
  updated_at,
  updated_by
)
SELECT
  schedule.id,
  panel.lecturer_id,
  CASE panel.role
    WHEN 'ketua-sidang' THEN 'CHAIRMAN'
    WHEN 'penguji1' THEN 'EXAMINER_1'
    ELSE 'EXAMINER_2'
  END,
  COALESCE(panel.created_at, NOW()),
  panel.updated_at,
  panel.updated_by
FROM exam_panelists panel
JOIN thesis_schedules schedule
  ON schedule.legacy_exam_id = panel.exam_id
WHERE panel.lecturer_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS revision_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES thesis_assessments(id) ON DELETE SET NULL,
  thesis_id UUID REFERENCES theses(id) ON DELETE SET NULL,
  thesis_stage_id UUID REFERENCES thesis_stages(id) ON DELETE SET NULL,
  legacy_revision_item_id UUID UNIQUE REFERENCES revision_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT revision_notes_title_not_blank CHECK (TRIM(title) <> '')
);

CREATE INDEX IF NOT EXISTS idx_revision_notes_assessment
  ON revision_notes(assessment_id);

CREATE INDEX IF NOT EXISTS idx_revision_notes_thesis
  ON revision_notes(thesis_id, thesis_stage_id);

INSERT INTO revision_notes (
  legacy_revision_item_id,
  thesis_id,
  thesis_stage_id,
  title,
  note,
  status,
  created_at,
  updated_at,
  updated_by
)
SELECT
  item.id,
  thesis.id,
  stage.id,
  item.title,
  COALESCE(item.materi, item.topik, item.penyelesaian),
  CASE item.status
    WHEN 'done' THEN 'COMPLETED'
    WHEN 'in progress' THEN 'PENDING'
    ELSE 'DRAFT'
  END,
  COALESCE(item.created_at, NOW()),
  item.updated_at,
  item.updated_by
FROM revision_items item
JOIN revision_workflows workflow
  ON workflow.id = item.revision_workflow_id
JOIN thesis_stages stage
  ON stage.legacy_step_id = workflow.stage_id
LEFT JOIN theses thesis
  ON thesis.student_id = workflow.student_id
  AND thesis.status IN ('ACTIVE', 'IN_PROGRESS')
ON CONFLICT DO NOTHING;

ALTER TABLE guidance_materials
  ADD COLUMN IF NOT EXISTS guidance_request_id UUID,
  ADD COLUMN IF NOT EXISTS revision_note_id UUID,
  ADD COLUMN IF NOT EXISTS submitted_by UUID,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS canonical_status TEXT;

UPDATE guidance_materials material
SET
  guidance_request_id = COALESCE(material.guidance_request_id, request.id),
  submitted_by = COALESCE(material.submitted_by, workflow.student_id),
  title = COALESCE(NULLIF(TRIM(material.title), ''), material.topic),
  canonical_status = COALESCE(
    material.canonical_status,
    CASE material.status
      WHEN 'Draft' THEN 'DRAFT'
      WHEN 'Diajukan' THEN 'PENDING'
      WHEN 'Valid' THEN 'VALID'
      WHEN 'Ditolak' THEN 'REJECTED'
      ELSE 'DRAFT'
    END
  )
FROM guidance_workflows workflow
LEFT JOIN guidance_requests request
  ON request.legacy_guidance_workflow_id = workflow.id
WHERE workflow.id = material.guidance_workflow_id;

UPDATE guidance_materials material
SET revision_note_id = note.id
FROM revision_notes note
WHERE note.legacy_revision_item_id = material.source_revision_item_id
  AND material.revision_note_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_guidance_materials_guidance_request
  ON guidance_materials(guidance_request_id);

CREATE INDEX IF NOT EXISTS idx_guidance_materials_revision_note
  ON guidance_materials(revision_note_id);

CREATE INDEX IF NOT EXISTS idx_guidance_materials_submitted_by
  ON guidance_materials(submitted_by);

CREATE INDEX IF NOT EXISTS idx_guidance_materials_canonical_status
  ON guidance_materials(canonical_status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guidance_materials_guidance_request_id_fkey'
  ) THEN
    ALTER TABLE guidance_materials
      ADD CONSTRAINT guidance_materials_guidance_request_id_fkey
      FOREIGN KEY (guidance_request_id) REFERENCES guidance_requests(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guidance_materials_revision_note_id_fkey'
  ) THEN
    ALTER TABLE guidance_materials
      ADD CONSTRAINT guidance_materials_revision_note_id_fkey
      FOREIGN KEY (revision_note_id) REFERENCES revision_notes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guidance_materials_submitted_by_fkey'
  ) THEN
    ALTER TABLE guidance_materials
      ADD CONSTRAINT guidance_materials_submitted_by_fkey
      FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guidance_materials_canonical_status_check'
  ) THEN
    ALTER TABLE guidance_materials
      ADD CONSTRAINT guidance_materials_canonical_status_check
      CHECK (
        canonical_status IS NULL
        OR canonical_status IN ('DRAFT', 'PENDING', 'VALID', 'REJECTED')
      );
  END IF;
END $$;

CREATE OR REPLACE VIEW canonical_thesis_lifecycle_summary AS
SELECT
  thesis.id AS thesis_id,
  thesis.registration_id,
  thesis.student_id,
  COALESCE(student.full_name, student.name) AS student_name,
  thesis.title,
  thesis.status AS thesis_status,
  stage.code AS current_stage_code,
  stage.name AS current_stage_name,
  registration.status AS registration_status,
  registration.submitted_at AS registration_submitted_at,
  registration.validated_at AS registration_validated_at,
  thesis.started_at,
  thesis.created_at
FROM theses thesis
JOIN users student
  ON student.id = thesis.student_id
JOIN thesis_registrations registration
  ON registration.id = thesis.registration_id
LEFT JOIN thesis_stages stage
  ON stage.id = thesis.current_stage_id;

CREATE OR REPLACE VIEW canonical_guidance_material_summary AS
SELECT
  material.id AS material_id,
  request.id AS guidance_request_id,
  request.thesis_id,
  request.thesis_stage_id,
  stage.code AS stage_code,
  material.submitted_by,
  COALESCE(material.title, material.topic) AS title,
  material.canonical_status,
  material.status AS legacy_status,
  material.submitted_at,
  material.validated_at,
  material.validated_by
FROM guidance_materials material
LEFT JOIN guidance_requests request
  ON request.id = material.guidance_request_id
LEFT JOIN thesis_stages stage
  ON stage.id = request.thesis_stage_id;
