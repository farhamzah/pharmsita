-- PharmSITA User Profile Contact Persistence
-- Adds shared profile fields used by the standalone profile edit flow.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Laki-laki', 'Perempuan')),
  ADD COLUMN IF NOT EXISTS birth_date DATE;
