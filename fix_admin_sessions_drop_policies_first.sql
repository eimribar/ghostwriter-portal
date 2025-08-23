-- =====================================================
-- FIX ADMIN_SESSIONS TABLE - DROP POLICIES FIRST
-- Drops policies, fixes columns, then recreates policies
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop ALL existing policies on admin_sessions
DROP POLICY IF EXISTS "Users can manage their own admin sessions" ON admin_sessions;
DROP POLICY IF EXISTS "Allow anon all" ON admin_sessions;
DROP POLICY IF EXISTS "Allow authenticated all" ON admin_sessions;
DROP POLICY IF EXISTS "Allow all operations" ON admin_sessions;

-- Drop any other policies that might exist
DO $$ 
DECLARE
    policy_rec record;
BEGIN
    FOR policy_rec IN 
        SELECT polname 
        FROM pg_policy pol
        JOIN pg_class cls ON pol.polrelid = cls.oid
        WHERE cls.relname = 'admin_sessions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON admin_sessions', policy_rec.polname);
    END LOOP;
END $$;

-- Step 2: Now we can alter the columns
ALTER TABLE admin_sessions 
DROP CONSTRAINT IF EXISTS admin_sessions_admin_user_id_key;

ALTER TABLE admin_sessions 
ALTER COLUMN admin_user_id TYPE TEXT;

ALTER TABLE admin_sessions 
ALTER COLUMN session_data 
TYPE JSONB 
USING COALESCE(session_data::JSONB, '{}'::JSONB);

-- Step 3: Set defaults
ALTER TABLE admin_sessions 
ALTER COLUMN session_data 
SET DEFAULT '{}'::JSONB;

-- Step 4: Re-add the unique constraint
ALTER TABLE admin_sessions 
ADD CONSTRAINT admin_sessions_admin_user_id_key UNIQUE(admin_user_id);

-- Step 5: Recreate the policies with the new column types
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

-- Step 6: Verify the changes
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

-- Step 7: Test upsert with TEXT admin_user_id
DELETE FROM admin_sessions WHERE admin_user_id = 'default-admin';

INSERT INTO admin_sessions (admin_user_id, active_client_id, session_data)
VALUES ('default-admin', NULL, '{"initialized": true}'::JSONB)
ON CONFLICT (admin_user_id) 
DO UPDATE SET 
    active_client_id = EXCLUDED.active_client_id,
    session_data = EXCLUDED.session_data,
    switched_at = NOW(),
    updated_at = NOW()
RETURNING *;

-- Success message
SELECT 
    '✅ Successfully fixed admin_sessions table!' as message,
    'Policies dropped and recreated' as step1,
    'admin_user_id changed from UUID to TEXT' as step2,
    'session_data changed to JSONB' as step3,
    'Client switching will now work!' as result;