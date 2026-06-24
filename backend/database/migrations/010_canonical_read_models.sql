-- PharmSITA canonical read models for directory, lecturer monitoring, and coordinator reporting.
-- Requires:
--   migrations/001_auth_master_data.sql
--   migrations/002_permissions_and_workflow.sql
--   migrations/003_multi_role_first_login.sql
--   migrations/004_final_project_registration.sql
--   migrations/005_guidance_type_materials.sql
--   migrations/006_audit_export_guard.sql
--   migrations/007_user_profile_contact.sql
--   migrations/008_role_profile_fields.sql
--   migrations/009_canonical_pharmsita_schema_boundary.sql

CREATE OR REPLACE VIEW canonical_student_directory_summary AS
WITH latest_thesis AS (
  SELECT DISTINCT ON (summary.student_id)
    summary.thesis_id,
    summary.registration_id,
    summary.student_id,
    summary.title,
    summary.thesis_status,
    summary.current_stage_code,
    summary.current_stage_name,
    summary.registration_status,
    summary.registration_submitted_at,
    summary.registration_validated_at,
    summary.started_at,
    summary.created_at
  FROM canonical_thesis_lifecycle_summary summary
  ORDER BY
    summary.student_id,
    COALESCE(
      summary.started_at,
      summary.registration_validated_at,
      summary.registration_submitted_at,
      summary.created_at
    ) DESC,
    summary.thesis_id DESC
),
canonical_supervisors AS (
  SELECT
    committee.thesis_id,
    MAX(committee.lecturer_id::TEXT) FILTER (WHERE committee.role = 'SUPERVISOR_1') AS supervisor1_id,
    MAX(COALESCE(lecturer.full_name, lecturer.name)) FILTER (WHERE committee.role = 'SUPERVISOR_1') AS supervisor1_name,
    MAX(committee.lecturer_id::TEXT) FILTER (WHERE committee.role = 'SUPERVISOR_2') AS supervisor2_id,
    MAX(COALESCE(lecturer.full_name, lecturer.name)) FILTER (WHERE committee.role = 'SUPERVISOR_2') AS supervisor2_name
  FROM thesis_committees committee
  JOIN users lecturer
    ON lecturer.id = committee.lecturer_id
  GROUP BY committee.thesis_id
),
stage_counts AS (
  SELECT
    latest.thesis_id,
    COUNT(stage.id)::INTEGER AS total_stages,
    COUNT(stage.id) FILTER (
      WHERE current_stage.sort_order IS NOT NULL
        AND stage.sort_order < current_stage.sort_order
    )::INTEGER AS completed_stages
  FROM latest_thesis latest
  LEFT JOIN thesis_stages current_stage
    ON current_stage.code = latest.current_stage_code
  LEFT JOIN thesis_stages stage
    ON stage.is_active = TRUE
    AND stage.legacy_step_id IS NOT NULL
  GROUP BY latest.thesis_id
)
SELECT
  student.id AS student_id,
  student.identifier,
  COALESCE(student.full_name, student.name) AS student_name,
  student.email,
  student.status AS student_status,
  profile.nim,
  COALESCE(study_program.name, profile.program_studi) AS program_studi,
  profile.angkatan,
  profile.kelas,
  latest.thesis_id,
  latest.registration_id,
  latest.title AS thesis_title,
  latest.thesis_status,
  latest.current_stage_code,
  latest.current_stage_name,
  stage.legacy_step_id AS current_legacy_step_id,
  latest.registration_status,
  supervisors.supervisor1_id,
  supervisors.supervisor1_name,
  supervisors.supervisor2_id,
  supervisors.supervisor2_name,
  COALESCE(stage_counts.completed_stages, 0) AS completed_steps,
  COALESCE(stage_counts.total_stages, 0) AS total_steps
FROM users student
LEFT JOIN student_profiles profile
  ON profile.user_id = student.id
LEFT JOIN study_programs study_program
  ON study_program.id = student.study_program_id
LEFT JOIN latest_thesis latest
  ON latest.student_id = student.id
LEFT JOIN thesis_stages stage
  ON stage.code = latest.current_stage_code
LEFT JOIN canonical_supervisors supervisors
  ON supervisors.thesis_id = latest.thesis_id
LEFT JOIN stage_counts
  ON stage_counts.thesis_id = latest.thesis_id
WHERE student.status = 'Aktif'
  AND (
    student.role = 'mahasiswa'
    OR EXISTS (
      SELECT 1
      FROM user_roles assignment
      WHERE assignment.user_id = student.id
        AND assignment.role = 'mahasiswa'
        AND assignment.status = 'Aktif'
    )
  );

CREATE OR REPLACE VIEW canonical_lecturer_monitoring_summary AS
SELECT
  lecturer.id AS lecturer_id,
  lecturer.identifier,
  COALESCE(lecturer.full_name, lecturer.name) AS lecturer_name,
  lecturer.email,
  lecturer.status AS lecturer_status,
  profile.nidn,
  profile.expertise,
  COALESCE(study_program.name, profile.program_studi) AS program_studi,
  profile.jabatan_akademik AS jabatan,
  COALESCE(quota.supervisor_1_quota, profile.quota_limit, 0) AS supervisor_1_quota,
  COALESCE(quota.supervisor_2_quota, profile.quota_limit, 0) AS supervisor_2_quota,
  COUNT(committee.id) FILTER (
    WHERE committee.role = 'SUPERVISOR_1'
      AND thesis.status IN ('ACTIVE', 'IN_PROGRESS')
  )::INTEGER AS p1_active,
  COUNT(committee.id) FILTER (
    WHERE committee.role = 'SUPERVISOR_2'
      AND thesis.status IN ('ACTIVE', 'IN_PROGRESS')
  )::INTEGER AS p2_active,
  COUNT(DISTINCT thesis.id) FILTER (
    WHERE thesis.status = 'COMPLETED'
  )::INTEGER AS completed_count
FROM users lecturer
LEFT JOIN lecturer_profiles profile
  ON profile.user_id = lecturer.id
LEFT JOIN study_programs study_program
  ON study_program.id = lecturer.study_program_id
LEFT JOIN lecturer_quotas quota
  ON quota.lecturer_id = lecturer.id
LEFT JOIN thesis_committees committee
  ON committee.lecturer_id = lecturer.id
LEFT JOIN theses thesis
  ON thesis.id = committee.thesis_id
WHERE lecturer.status = 'Aktif'
  AND (
    lecturer.role = 'dosen'
    OR EXISTS (
      SELECT 1
      FROM user_roles assignment
      WHERE assignment.user_id = lecturer.id
        AND assignment.role = 'dosen'
        AND assignment.status = 'Aktif'
    )
  )
GROUP BY
  lecturer.id,
  lecturer.identifier,
  lecturer.full_name,
  lecturer.name,
  lecturer.email,
  lecturer.status,
  profile.nidn,
  profile.expertise,
  study_program.name,
  profile.program_studi,
  profile.jabatan_akademik,
  quota.supervisor_1_quota,
  quota.supervisor_2_quota,
  profile.quota_limit;

CREATE OR REPLACE VIEW canonical_coordinator_reporting_summary AS
WITH latest_thesis AS (
  SELECT DISTINCT ON (thesis.student_id)
    thesis.id,
    thesis.registration_id,
    thesis.student_id,
    thesis.status,
    thesis.current_stage_id,
    thesis.started_at,
    thesis.created_at,
    thesis.updated_at
  FROM theses thesis
  ORDER BY
    thesis.student_id,
    COALESCE(thesis.updated_at, thesis.started_at, thesis.created_at) DESC,
    thesis.id DESC
),
latest_registration AS (
  SELECT DISTINCT ON (registration.student_id)
    registration.id,
    registration.student_id,
    registration.status,
    registration.submitted_at,
    registration.validated_at,
    registration.created_at,
    registration.updated_at
  FROM thesis_registrations registration
  ORDER BY
    registration.student_id,
    COALESCE(
      registration.updated_at,
      registration.validated_at,
      registration.submitted_at,
      registration.created_at
    ) DESC,
    registration.id DESC
)
SELECT
  COALESCE(stage.code, 'UNREGISTERED') AS stage_code,
  COALESCE(stage.name, 'Belum Pendaftaran TA') AS stage_name,
  COALESCE(thesis.status, registration.status, 'UNREGISTERED') AS lifecycle_status,
  COUNT(DISTINCT student.id)::INTEGER AS student_count,
  COUNT(DISTINCT thesis.id) FILTER (
    WHERE thesis.status IN ('ACTIVE', 'IN_PROGRESS')
  )::INTEGER AS active_thesis_count,
  COUNT(DISTINCT thesis.id) FILTER (
    WHERE thesis.status = 'COMPLETED'
  )::INTEGER AS completed_thesis_count
FROM users student
LEFT JOIN latest_thesis thesis
  ON thesis.student_id = student.id
LEFT JOIN latest_registration registration
  ON registration.student_id = student.id
LEFT JOIN thesis_stages stage
  ON stage.id = thesis.current_stage_id
WHERE student.status = 'Aktif'
  AND (
    student.role = 'mahasiswa'
    OR EXISTS (
      SELECT 1
      FROM user_roles assignment
      WHERE assignment.user_id = student.id
        AND assignment.role = 'mahasiswa'
        AND assignment.status = 'Aktif'
    )
  )
GROUP BY
  COALESCE(stage.code, 'UNREGISTERED'),
  COALESCE(stage.name, 'Belum Pendaftaran TA'),
  COALESCE(thesis.status, registration.status, 'UNREGISTERED');
