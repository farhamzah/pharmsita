-- PharmSITA Audit Export Guard Schema
-- Dialect: PostgreSQL-compatible SQL
-- Depends on:
--   migrations/001_auth_master_data.sql

CREATE TABLE IF NOT EXISTS audit_export_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT CHECK (actor_role IS NULL OR actor_role IN ('mahasiswa', 'dosen', 'admin', 'koordinator')),
  scope TEXT NOT NULL CHECK (scope IN ('admin', 'koordinator')),
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  allowed BOOLEAN NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  attempts_in_window INTEGER NOT NULL CHECK (attempts_in_window > 0),
  max_attempts INTEGER NOT NULL CHECK (max_attempts > 0),
  window_seconds INTEGER NOT NULL CHECK (window_seconds > 0)
);

CREATE INDEX IF NOT EXISTS idx_audit_export_attempts_guard
  ON audit_export_attempts(actor_id, actor_role, scope, attempted_at)
  WHERE allowed = TRUE;

CREATE INDEX IF NOT EXISTS idx_audit_export_attempts_scope_time
  ON audit_export_attempts(scope, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_export_attempts_allowed
  ON audit_export_attempts(allowed, attempted_at DESC);
