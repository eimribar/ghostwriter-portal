-- =====================================================
-- COMPLETE FIX FOR ADMIN_SESSIONS TABLE
-- Fixes both admin_user_id (UUID->TEXT) and session_data (TEXT->JSONB)
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop the existing constraint and change admin_user_id to TEXT
ALTER TABLE admin_sessions 
DROP CONSTRAINT IF EXISTS admin_sessions_admin_user_id_key;

ALTER TABLE admin_sessions 
ALTER COLUMN admin_user_id TYPE TEXT;

-- Step 2: Fix session_data column type (if needed)
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

-- Step 5: Verify the changes
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

-- Step 6: Test upsert with TEXT admin_user_id
INSERT INTO admin_sessions (admin_user_id, active_client_id, session_data)
VALUES ('default-admin', NULL, '{"test": true}'::JSONB)
ON CONFLICT (admin_user_id) 
DO UPDATE SET 
    active_client_id = EXCLUDED.active_client_id,
    session_data = EXCLUDED.session_data,
    switched_at = NOW(),
    updated_at = NOW()
RETURNING *;

-- Success message
SELECT 
    '✅ Fixed admin_sessions table completely!' as message,
    'admin_user_id is now TEXT and session_data is JSONB' as changes,
    'Client switching should work perfectly now!' as status;