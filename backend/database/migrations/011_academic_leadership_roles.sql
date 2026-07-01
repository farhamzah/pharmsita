-- PharmSITA Academic Leadership Roles
-- Dialect: PostgreSQL-compatible SQL
-- Depends on:
--   migrations/001_auth_master_data.sql
--   migrations/002_permissions_and_workflow.sql
--   migrations/003_multi_role_first_login.sql
--   migrations/006_audit_export_guard.sql
--   migrations/009_canonical_pharmsita_schema_boundary.sql

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check,
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('mahasiswa', 'dosen', 'admin', 'koordinator', 'kaprodi', 'dekan'));

ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_actor_role_check,
  ADD CONSTRAINT audit_logs_actor_role_check
    CHECK (actor_role IN ('mahasiswa', 'dosen', 'admin', 'koordinator', 'kaprodi', 'dekan'));

ALTER TABLE refresh_tokens
  DROP CONSTRAINT IF EXISTS refresh_tokens_role_check,
  ADD CONSTRAINT refresh_tokens_role_check
    CHECK (role IS NULL OR role IN ('mahasiswa', 'dosen', 'admin', 'koordinator', 'kaprodi', 'dekan'));

ALTER TABLE user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check,
  ADD CONSTRAINT user_roles_role_check
    CHECK (role IN ('mahasiswa', 'dosen', 'admin', 'koordinator', 'kaprodi', 'dekan'));

ALTER TABLE role_permissions
  DROP CONSTRAINT IF EXISTS role_permissions_role_check,
  ADD CONSTRAINT role_permissions_role_check
    CHECK (role IN ('mahasiswa', 'dosen', 'admin', 'koordinator', 'kaprodi', 'dekan'));

ALTER TABLE audit_export_attempts
  DROP CONSTRAINT IF EXISTS audit_export_attempts_actor_role_check,
  ADD CONSTRAINT audit_export_attempts_actor_role_check
    CHECK (actor_role IS NULL OR actor_role IN ('mahasiswa', 'dosen', 'admin', 'koordinator', 'kaprodi', 'dekan'));

INSERT INTO roles (code, name)
VALUES
  ('kaprodi', 'Kaprodi'),
  ('dekan', 'Dekan')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO role_permissions (role, permission)
VALUES
  ('kaprodi', 'coordinator.workflow.read'),
  ('kaprodi', 'coordinator.progress.manage'),
  ('kaprodi', 'coordinator.exam.manage'),
  ('kaprodi', 'coordinator.validation.manage'),
  ('kaprodi', 'coordinator.monitoring.read'),
  ('kaprodi', 'coordinator.final-project-registration.read'),
  ('kaprodi', 'coordinator.final-project-registration.validate'),
  ('kaprodi', 'coordinator.guidance.read'),
  ('dekan', 'coordinator.workflow.read'),
  ('dekan', 'coordinator.monitoring.read'),
  ('dekan', 'coordinator.final-project-registration.read'),
  ('dekan', 'coordinator.guidance.read')
ON CONFLICT (role, permission) DO NOTHING;
