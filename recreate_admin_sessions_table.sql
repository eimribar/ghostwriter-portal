-- =====================================================
-- RECREATE ADMIN_SESSIONS TABLE FROM SCRATCH
-- Drops and recreates the table with correct column types
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop the existing table completely
DROP TABLE IF EXISTS admin_sessions CASCADE;

-- Step 2: Create the table with correct column types
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL,  -- TEXT to support 'default-admin'
  active_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  switched_at TIMESTAMPTZ DEFAULT NOW(),
  session_data JSONB DEFAULT '{}'::JSONB,  -- JSONB for JSON data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT admin_sessions_admin_user_id_key UNIQUE(admin_user_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_admin_sessions_admin_user_id ON admin_sessions(admin_user_id);
CREATE INDEX idx_admin_sessions_active_client_id ON admin_sessions(active_client_id);

-- Step 4: Enable RLS
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Step 5: Create permissive policies
CREATE POLICY "Allow anon all" ON admin_sessions
FOR ALL 
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated all" ON admin_sessions
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 6: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_sessions_updated_at
BEFORE UPDATE ON admin_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'admin_sessions'
ORDER BY ordinal_position;

-- Step 8: Test with default-admin
INSERT INTO admin_sessions (admin_user_id, active_client_id, session_data)
VALUES ('default-admin', NULL, '{"initialized": true}'::JSONB)
ON CONFLICT (admin_user_id) 
DO UPDATE SET 
    active_client_id = EXCLUDED.active_client_id,
    session_data = EXCLUDED.session_data,
    switched_at = NOW()
RETURNING *;

-- Step 9: Check policies
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

-- Success message
SELECT 
    '✅ Admin sessions table recreated successfully!' as message,
    'admin_user_id is TEXT (supports "default-admin")' as detail1,
    'session_data is JSONB (supports JSON objects)' as detail2,
    'Client switching should work perfectly now!' as result;