-- =====================================================
-- CLEANUP ADMIN SESSIONS
-- Removes duplicate sessions and keeps only default-admin
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Show all existing admin sessions
SELECT * FROM admin_sessions ORDER BY created_at;

-- Step 2: Delete all sessions except 'default-admin'
DELETE FROM admin_sessions 
WHERE admin_user_id != 'default-admin';

-- Step 3: Ensure we have a clean default-admin session
DELETE FROM admin_sessions WHERE admin_user_id = 'default-admin';

INSERT INTO admin_sessions (
  admin_user_id, 
  active_client_id, 
  session_data,
  switched_at
) VALUES (
  'default-admin',
  NULL,
  '{"initialized": true}'::JSONB,
  NOW()
);

-- Step 4: Verify we have exactly one session
SELECT 
  admin_user_id,
  active_client_id,
  session_data,
  switched_at
FROM admin_sessions;

-- Success message
SELECT 
  '✅ Admin sessions cleaned up!' as message,
  'Only default-admin session exists now' as status;