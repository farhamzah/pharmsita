-- PharmSITA Guidance Type + Guidance Materials Schema
-- Dialect: PostgreSQL-compatible SQL
-- Depends on:
--   migrations/001_auth_master_data.sql
--   migrations/002_permissions_and_workflow.sql
--   migrations/003_multi_role_first_login.sql
--   migrations/004_final_project_registration.sql

INSERT INTO role_permissions (role, permission)
VALUES
  ('mahasiswa', 'student.guidance-request.read'),
  ('mahasiswa', 'student.guidance-request.submit'),
  ('mahasiswa', 'student.guidance-material.submit'),
  ('dosen', 'lecturer.guidance-request.read'),
  ('dosen', 'lecturer.guidance-request.validate'),
  ('dosen', 'lecturer.guidance-material.read'),
  ('dosen', 'lecturer.guidance-material.validate'),
  ('koordinator', 'coordinator.guidance.read')
ON CONFLICT (role, permission) DO NOTHING;

ALTER TABLE guidance_workflows
  ADD COLUMN IF NOT EXISTS guidance_type TEXT,
  ADD COLUMN IF NOT EXISTS request_status TEXT NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lecturer_note TEXT;

ALTER TABLE guidance_workflows
  DROP CONSTRAINT IF EXISTS guidance_workflows_stage_id_check;

ALTER TABLE guidance_workflows
  ADD CONSTRAINT guidance_workflows_stage_id_check CHECK (
    stage_id IN (
      'bimbingan-pra-proposal',
      'bimbingan-pra-sidang',
      'revisi-proposal',
      'revisi-sidang'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guidance_workflows_guidance_type_check'
  ) THEN
    ALTER TABLE guidance_workflows
      ADD CONSTRAINT guidance_workflows_guidance_type_check CHECK (
        guidance_type IS NULL OR guidance_type IN (
          'seminar-proposal',
          'sidang-akhir',
          'revisi-seminar-proposal',
          'revisi-sidang-akhir'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guidance_workflows_request_status_check'
  ) THEN
    ALTER TABLE guidance_workflows
      ADD CONSTRAINT guidance_workflows_request_status_check CHECK (
        request_status IN (
          'Draft',
          'Menunggu Validasi Dosen',
          'Disetujui',
          'Ditolak'
        )
      );
  END IF;
END $$;

UPDATE guidance_workflows
SET guidance_type = CASE stage_id
  WHEN 'bimbingan-pra-proposal' THEN 'seminar-proposal'
  WHEN 'bimbingan-pra-sidang' THEN 'sidang-akhir'
  WHEN 'revisi-proposal' THEN 'revisi-seminar-proposal'
  WHEN 'revisi-sidang' THEN 'revisi-sidang-akhir'
  ELSE guidance_type
END
WHERE guidance_type IS NULL;

UPDATE guidance_workflows
SET request_status = CASE guidance_status
  WHEN 'requested' THEN 'Menunggu Validasi Dosen'
  WHEN 'approved' THEN 'Disetujui'
  ELSE request_status
END
WHERE request_status = 'Draft'
  AND guidance_status IN ('requested', 'approved');

UPDATE guidance_workflows
SET
  validated_at = COALESCE(validated_at, guidance_approved_at),
  lecturer_note = COALESCE(lecturer_note, guidance_approval_note)
WHERE guidance_status = 'approved';

CREATE OR REPLACE FUNCTION set_guidance_workflow_alignment_defaults()
RETURNS trigger AS $$
BEGIN
  IF NEW.guidance_type IS NULL THEN
    NEW.guidance_type := CASE NEW.stage_id
      WHEN 'bimbingan-pra-proposal' THEN 'seminar-proposal'
      WHEN 'bimbingan-pra-sidang' THEN 'sidang-akhir'
      WHEN 'revisi-proposal' THEN 'revisi-seminar-proposal'
      WHEN 'revisi-sidang' THEN 'revisi-sidang-akhir'
      ELSE NEW.guidance_type
    END;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.request_status := CASE NEW.guidance_status
      WHEN 'requested' THEN 'Menunggu Validasi Dosen'
      WHEN 'approved' THEN 'Disetujui'
      ELSE 'Draft'
    END;
  ELSIF NEW.guidance_status IS DISTINCT FROM OLD.guidance_status THEN
    NEW.request_status := CASE NEW.guidance_status
      WHEN 'requested' THEN 'Menunggu Validasi Dosen'
      WHEN 'approved' THEN 'Disetujui'
      ELSE 'Draft'
    END;
  END IF;

  IF NEW.guidance_status = 'approved' THEN
    NEW.validated_at := COALESCE(NEW.validated_at, NEW.guidance_approved_at);
    NEW.lecturer_note := COALESCE(NEW.lecturer_note, NEW.guidance_approval_note);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guidance_workflows_alignment_defaults
  ON guidance_workflows;

CREATE TRIGGER trg_guidance_workflows_alignment_defaults
  BEFORE INSERT OR UPDATE ON guidance_workflows
  FOR EACH ROW
  EXECUTE FUNCTION set_guidance_workflow_alignment_defaults();

CREATE UNIQUE INDEX IF NOT EXISTS idx_guidance_workflows_one_type_per_student
  ON guidance_workflows(student_id, guidance_type)
  WHERE guidance_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guidance_workflows_type_status
  ON guidance_workflows(guidance_type, request_status)
  WHERE guidance_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guidance_workflows_validated_by
  ON guidance_workflows(validated_by);

CREATE TABLE IF NOT EXISTS guidance_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guidance_workflow_id UUID NOT NULL REFERENCES guidance_workflows(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL DEFAULT 'normal' CHECK (material_type IN ('normal', 'revision')),
  source_revision_item_id UUID REFERENCES revision_items(id) ON DELETE SET NULL,
  topic TEXT NOT NULL DEFAULT '',
  content TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (
    status IN ('Draft', 'Diajukan', 'Valid', 'Ditolak')
  ),
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  lecturer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT guidance_materials_normal_topic_required CHECK (
    material_type <> 'normal' OR NULLIF(TRIM(topic), '') IS NOT NULL
  ),
  CONSTRAINT guidance_materials_revision_source_required CHECK (
    material_type <> 'revision' OR source_revision_item_id IS NOT NULL
  ),
  CONSTRAINT guidance_materials_validation_note_required CHECK (
    status <> 'Ditolak' OR NULLIF(TRIM(COALESCE(lecturer_note, '')), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_guidance_materials_workflow
  ON guidance_materials(guidance_workflow_id);

CREATE INDEX IF NOT EXISTS idx_guidance_materials_status
  ON guidance_materials(status);

CREATE INDEX IF NOT EXISTS idx_guidance_materials_validated_by
  ON guidance_materials(validated_by);

CREATE INDEX IF NOT EXISTS idx_guidance_materials_source_revision_item
  ON guidance_materials(source_revision_item_id)
  WHERE source_revision_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guidance_materials_valid_count
  ON guidance_materials(guidance_workflow_id)
  WHERE status = 'Valid';

CREATE UNIQUE INDEX IF NOT EXISTS idx_guidance_materials_revision_attempt
  ON guidance_materials(guidance_workflow_id, source_revision_item_id, attempt_number)
  WHERE source_revision_item_id IS NOT NULL;
