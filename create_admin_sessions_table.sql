-- =====================================================
-- CREATE ADMIN SESSIONS TABLE & FIX RLS
-- Creates the admin_sessions table for client switching
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop the table if it exists (for clean recreation)
-- Comment this out if you want to preserve existing data
-- DROP TABLE IF EXISTS admin_sessions CASCADE;

-- Create the admin_sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL,
  active_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  switched_at TIMESTAMPTZ DEFAULT NOW(),
  session_data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT admin_sessions_admin_user_id_key UNIQUE(admin_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active_client_id ON admin_sessions(active_client_id);

-- Enable RLS
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow all operations" ON admin_sessions;
DROP POLICY IF EXISTS "Allow anon all" ON admin_sessions;
DROP POLICY IF EXISTS "Allow authenticated all" ON admin_sessions;

-- =====================================================
-- CREATE PERMISSIVE POLICIES
-- =====================================================

-- Allow all operations for anon (since we're not using auth)
CREATE POLICY "Allow anon all" ON admin_sessions
FOR ALL 
TO anon
USING (true)
WITH CHECK (true);

-- Allow all operations for authenticated users
CREATE POLICY "Allow authenticated all" ON admin_sessions
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- CREATE TRIGGER FOR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_admin_sessions_updated_at ON admin_sessions;

CREATE TRIGGER update_admin_sessions_updated_at
BEFORE UPDATE ON admin_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFY THE TABLE
-- =====================================================

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'admin_sessions'
ORDER BY 
    ordinal_position;

-- Check policies
SELECT 
    pol.polname as policy_name,
    CASE 
        WHEN pol.polroles = '{0}'::oid[] THEN 'PUBLIC'
        ELSE array_to_string(
            ARRAY(
                SELECT rolname 
                FROM pg_roles 
                WHERE oid = ANY(pol.polroles)
            ), 
            ', '
        )
    END as roles
FROM 
    pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE 
    cls.relname = 'admin_sessions';

-- Check RLS status
SELECT 
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '⚠️ RLS Disabled'
    END as status
FROM 
    pg_tables
WHERE 
    tablename = 'admin_sessions';

-- =====================================================
-- TEST DATA (Optional)
-- =====================================================

-- Insert a test session (uncomment to test)
/*
INSERT INTO admin_sessions (admin_user_id, active_client_id, session_data)
VALUES ('default-admin', NULL, '{"test": true}'::JSONB)
ON CONFLICT (admin_user_id) 
DO UPDATE SET 
    switched_at = NOW(),
    updated_at = NOW();
*/

-- Success message
SELECT 
    '✅ Admin sessions table created successfully!' as message,
    'The table is ready for client switching functionality' as status,
    'Both anon and authenticated users can manage sessions' as permissions;