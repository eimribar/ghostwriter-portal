-- =====================================================
-- CHECK IMPERSONATION SETUP
-- Verify everything is working
-- =====================================================

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'admin_impersonation_sessions'
) AS table_exists;

-- Check if functions exist
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'create_impersonation_token'
) AS create_function_exists;

SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'validate_impersonation_token'
) AS validate_function_exists;

-- Test creating a token (replace with a real client_id from your database)
-- SELECT * FROM create_impersonation_token(
--   'admin@test.com',
--   '6334e5b0-b407-4292-9bd4-339425778452'::uuid,
--   'Test impersonation',
--   '127.0.0.1',
--   'Test Browser'
-- );

-- View any existing sessions
SELECT 
  token,
  admin_email,
  client_id,
  reason,
  created_at,
  expires_at,
  ended_at
FROM admin_impersonation_sessions
ORDER BY created_at DESC
LIMIT 10;