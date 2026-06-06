-- PharmSITA Permissions + Workflow Schema
-- Dialect: PostgreSQL-compatible SQL
-- Depends on: 001_auth_master_data.sql

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL CHECK (role IN ('mahasiswa', 'dosen', 'admin', 'koordinator')),
  permission TEXT NOT NULL CHECK (TRIM(permission) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role, permission)
);

INSERT INTO role_permissions (role, permission)
VALUES
  ('mahasiswa', 'student.workflow.read'),
  ('mahasiswa', 'student.workflow.submit'),
  ('dosen', 'lecturer.workflow.read'),
  ('dosen', 'lecturer.guidance.read'),
  ('dosen', 'lecturer.guidance.approve'),
  ('dosen', 'lecturer.exam.assess'),
  ('dosen', 'lecturer.revision.review'),
  ('koordinator', 'coordinator.workflow.read'),
  ('koordinator', 'coordinator.progress.manage'),
  ('koordinator', 'coordinator.exam.manage'),
  ('koordinator', 'coordinator.validation.manage'),
  ('koordinator', 'coordinator.monitoring.read'),
  ('admin', 'admin.users.manage'),
  ('admin', 'admin.master.manage'),
  ('admin', 'audit.read'),
  ('admin', 'workflow.override')
ON CONFLICT (role, permission) DO NOTHING;

CREATE TABLE IF NOT EXISTS student_progress_steps (
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL CHECK (
    step_id IN (
      'pendaftaran-ta',
      'bimbingan-pra-proposal',
      'sidang-proposal',
      'revisi-proposal',
      'bimbingan-pra-sidang',
      'sidang',
      'revisi-sidang'
    )
  ),
  step_order INTEGER NOT NULL CHECK (step_order > 0),
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (student_id, step_id),
  UNIQUE (student_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_student_progress_steps_status
  ON student_progress_steps(status);

CREATE TABLE IF NOT EXISTS student_requirement_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  drive_link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (student_id, stage_key),
  CONSTRAINT student_requirement_bundles_stage_key_not_blank CHECK (TRIM(stage_key) <> '')
);

CREATE INDEX IF NOT EXISTS idx_student_requirement_bundles_student_id
  ON student_requirement_bundles(student_id);

CREATE TABLE IF NOT EXISTS student_requirement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES student_requirement_bundles(id) ON DELETE CASCADE,
  requirement_definition_id UUID REFERENCES requirement_definitions(id) ON DELETE SET NULL,
  requirement_key TEXT,
  label_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Belum Upload' CHECK (
    status IN ('Valid', 'Menunggu Verifikasi', 'Perlu Revisi', 'Belum Upload', 'Ditolak')
  ),
  wajib BOOLEAN NOT NULL DEFAULT TRUE,
  file_ref TEXT,
  link_berkas TEXT,
  catatan_mahasiswa TEXT,
  catatan_koordinator TEXT,
  uploaded_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT student_requirement_records_key_present CHECK (
    requirement_definition_id IS NOT NULL OR NULLIF(TRIM(COALESCE(requirement_key, '')), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_student_requirement_records_bundle_id
  ON student_requirement_records(bundle_id);

CREATE INDEX IF NOT EXISTS idx_student_requirement_records_status
  ON student_requirement_records(status);

CREATE TABLE IF NOT EXISTS thesis_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  skema TEXT NOT NULL CHECK (skema IN ('Skripsi', 'Non Skripsi')),
  jenis_ta TEXT NOT NULL,
  judul_ta TEXT NOT NULL,
  deskripsi_ta TEXT NOT NULL,
  pembimbing1_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pembimbing2_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pembimbing1_name_snapshot TEXT,
  pembimbing2_name_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'Sedang Proses Validasi' CHECK (
    status IN ('Sedang Proses Validasi', 'Diterima', 'Ditolak')
  ),
  catatan_koordinator TEXT,
  bukti_file_ref TEXT,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_thesis_submissions_student_id
  ON thesis_submissions(student_id);

CREATE INDEX IF NOT EXISTS idx_thesis_submissions_status
  ON thesis_submissions(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_thesis_submissions_one_pending_per_student
  ON thesis_submissions(student_id)
  WHERE status = 'Sedang Proses Validasi';

CREATE TABLE IF NOT EXISTS guidance_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL CHECK (stage_id IN ('bimbingan-pra-proposal', 'bimbingan-pra-sidang')),
  google_docs_link TEXT NOT NULL DEFAULT '',
  final_file_ref TEXT,
  pembimbing1_approved BOOLEAN NOT NULL DEFAULT FALSE,
  pembimbing2_approved BOOLEAN NOT NULL DEFAULT FALSE,
  guidance_status TEXT NOT NULL DEFAULT 'idle' CHECK (guidance_status IN ('idle', 'requested', 'approved')),
  guidance_requested_at TIMESTAMPTZ,
  guidance_approved_at TIMESTAMPTZ,
  guidance_start_date DATE,
  guidance_start_time TIME,
  guidance_note TEXT,
  guidance_approval_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (student_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_guidance_workflows_student_id
  ON guidance_workflows(student_id);

CREATE INDEX IF NOT EXISTS idx_guidance_workflows_stage_id
  ON guidance_workflows(stage_id);

CREATE INDEX IF NOT EXISTS idx_guidance_workflows_guidance_status
  ON guidance_workflows(guidance_status);

CREATE TABLE IF NOT EXISTS guidance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guidance_workflow_id UUID NOT NULL REFERENCES guidance_workflows(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL CHECK (session_number > 0),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in progress', 'approved')),
  session_status TEXT NOT NULL DEFAULT 'idle' CHECK (session_status IN ('idle', 'requested', 'approved')),
  session_start_date DATE,
  session_start_time TIME,
  catatan_mahasiswa TEXT,
  catatan_koordinator TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (guidance_workflow_id, session_number)
);

CREATE INDEX IF NOT EXISTS idx_guidance_sessions_workflow_id
  ON guidance_sessions(guidance_workflow_id);

CREATE INDEX IF NOT EXISTS idx_guidance_sessions_status
  ON guidance_sessions(status);

CREATE TABLE IF NOT EXISTS guidance_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guidance_session_id UUID NOT NULL REFERENCES guidance_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name_snapshot TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('mahasiswa', 'dosen')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guidance_chats_session_id
  ON guidance_chats(guidance_session_id);

CREATE INDEX IF NOT EXISTS idx_guidance_chats_created_at
  ON guidance_chats(created_at);

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL CHECK (stage_id IN ('sidang-proposal', 'sidang')),
  status TEXT NOT NULL DEFAULT 'belum-daftar' CHECK (
    status IN ('belum-daftar', 'menunggu-jadwal', 'terjadwal', 'selesai')
  ),
  google_docs_link TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ,
  grade TEXT,
  result_status TEXT NOT NULL DEFAULT 'belum-dinilai' CHECK (
    result_status IN ('belum-dinilai', 'lulus', 'lulus-dengan-revisi', 'tidak-lulus')
  ),
  revision_notes JSONB NOT NULL DEFAULT '[]'::JSONB,
  schedule_date DATE,
  schedule_start_time TIME,
  schedule_end_time TIME,
  schedule_room TEXT,
  schedule_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (student_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_exams_student_id
  ON exams(student_id);

CREATE INDEX IF NOT EXISTS idx_exams_stage_id
  ON exams(stage_id);

CREATE INDEX IF NOT EXISTS idx_exams_status
  ON exams(status);

CREATE TABLE IF NOT EXISTS exam_panelists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  lecturer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  panelist_key TEXT,
  role TEXT NOT NULL CHECK (role IN ('ketua-sidang', 'penguji1', 'penguji2')),
  role_label TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  nidn_snapshot TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (exam_id, role)
);

CREATE INDEX IF NOT EXISTS idx_exam_panelists_exam_id
  ON exam_panelists(exam_id);

CREATE INDEX IF NOT EXISTS idx_exam_panelists_lecturer_id
  ON exam_panelists(lecturer_id);

CREATE TABLE IF NOT EXISTS exam_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  requirement_key TEXT NOT NULL,
  label TEXT NOT NULL,
  fulfilled BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (exam_id, requirement_key)
);

CREATE INDEX IF NOT EXISTS idx_exam_requirements_exam_id
  ON exam_requirements(exam_id);

CREATE INDEX IF NOT EXISTS idx_exam_requirements_fulfilled
  ON exam_requirements(fulfilled);

CREATE TABLE IF NOT EXISTS revision_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL CHECK (stage_id IN ('revisi-proposal', 'revisi-sidang')),
  final_file_ref TEXT,
  penguji1_approved BOOLEAN NOT NULL DEFAULT FALSE,
  penguji2_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ketua_sidang_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    ketua_sidang_status IN ('pending', 'approved', 'rejected')
  ),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (student_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_revision_workflows_student_id
  ON revision_workflows(student_id);

CREATE INDEX IF NOT EXISTS idx_revision_workflows_stage_id
  ON revision_workflows(stage_id);

CREATE INDEX IF NOT EXISTS idx_revision_workflows_chair_status
  ON revision_workflows(ketua_sidang_status);

CREATE TABLE IF NOT EXISTS revision_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_workflow_id UUID NOT NULL REFERENCES revision_workflows(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL CHECK (item_number > 0),
  title TEXT NOT NULL,
  topik TEXT NOT NULL,
  materi TEXT NOT NULL,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_name_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in progress', 'done')),
  submitted_at TIMESTAMPTZ,
  penyelesaian TEXT,
  penyelesaian_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (revision_workflow_id, item_number)
);

CREATE INDEX IF NOT EXISTS idx_revision_items_workflow_id
  ON revision_items(revision_workflow_id);

CREATE INDEX IF NOT EXISTS idx_revision_items_assigned_to
  ON revision_items(assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_revision_items_status
  ON revision_items(status);

CREATE TABLE IF NOT EXISTS revision_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_item_id UUID NOT NULL REFERENCES revision_items(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name_snapshot TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('mahasiswa', 'dosen')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revision_chats_item_id
  ON revision_chats(revision_item_id);

CREATE INDEX IF NOT EXISTS idx_revision_chats_created_at
  ON revision_chats(created_at);
