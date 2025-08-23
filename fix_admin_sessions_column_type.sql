-- =====================================================
-- FIX ADMIN_SESSIONS TABLE COLUMN TYPE
-- Changes session_data from TEXT to JSONB
-- Run this in Supabase SQL Editor
-- =====================================================

-- First check the current column type
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'admin_sessions'
    AND column_name = 'session_data';

-- Alter the column type from TEXT to JSONB
ALTER TABLE admin_sessions 
ALTER COLUMN session_data 
TYPE JSONB 
USING session_data::JSONB;

-- Set a default value for the column
ALTER TABLE admin_sessions 
ALTER COLUMN session_data 
SET DEFAULT '{}'::JSONB;

-- Verify the change
SELECT 
    column_name,
    data_type,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'admin_sessions'
ORDER BY ordinal_position;

-- Test upsert (using a valid UUID for admin_user_id)
INSERT INTO admin_sessions (admin_user_id, active_client_id, session_data)
VALUES (gen_random_uuid(), NULL, '{"test": true}'::JSONB)
ON CONFLICT (admin_user_id) 
DO UPDATE SET 
    active_client_id = EXCLUDED.active_client_id,
    session_data = EXCLUDED.session_data,
    switched_at = NOW(),
    updated_at = NOW()
RETURNING *;

-- Note: Can't easily clean up test data since we used random UUID

-- Success message
SELECT 
    '✅ Fixed session_data column type to JSONB!' as message,
    'Client switching should work now' as status;