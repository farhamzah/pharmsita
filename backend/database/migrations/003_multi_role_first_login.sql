-- PharmSITA Multi-Role Auth + First Login Schema
-- Dialect: PostgreSQL-compatible SQL
-- Depends on:
--   migrations/001_auth_master_data.sql
--   migrations/002_permissions_and_workflow.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_login_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_login_completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (
    role IS NULL OR role IN ('mahasiswa', 'dosen', 'admin', 'koordinator')
  );

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('mahasiswa', 'dosen', 'admin', 'koordinator')),
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role
  ON user_roles(role);

CREATE INDEX IF NOT EXISTS idx_user_roles_status
  ON user_roles(status);

INSERT INTO user_roles (user_id, role, status, created_at)
SELECT id, role, status, COALESCE(created_at, NOW())
FROM users
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE users
SET
  first_login_completed_at = COALESCE(first_login_completed_at, created_at, NOW()),
  password_changed_at = COALESCE(password_changed_at, created_at, NOW())
WHERE password_status = 'active'
  AND force_change_on_login = FALSE;
