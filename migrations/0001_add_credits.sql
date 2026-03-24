-- Add credits system to users table
ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN monthly_quota_reset TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN monthly_usage INTEGER DEFAULT 0 NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
