-- Add 2FA columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled VARCHAR NOT NULL DEFAULT 'false';
