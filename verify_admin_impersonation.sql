-- =====================================================
-- VERIFY ADMIN IMPERSONATION SETUP
-- Run this to check if impersonation system is ready
-- =====================================================

-- Check if admin_impersonation table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'admin_impersonation'
) as admin_impersonation_exists;

-- Check if auth_audit_log table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'auth_audit_log'
) as auth_audit_log_exists;

-- Check if functions exist
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'create_impersonation_token'
) as create_token_function_exists;

SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'validate_impersonation_token'
) as validate_token_function_exists;

-- If tables don't exist, you need to run:
-- Database Scripts/admin_impersonation_system.sql

-- Test data: Check existing clients
SELECT 
  id,
  name,
  email,
  company,
  auth_status,
  portal_access
FROM clients
WHERE portal_access = true
ORDER BY created_at DESC
LIMIT 10;

-- Check for any existing impersonation sessions
SELECT 
  ai.*,
  c.name as client_name,
  c.email as client_email
FROM admin_impersonation ai
LEFT JOIN clients c ON c.id = ai.client_id
ORDER BY ai.created_at DESC
LIMIT 10;