-- =====================================================
-- FIX ROW LEVEL SECURITY FOR CLIENTS TABLE
-- Resolves "new row violates row-level security policy" error
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM 
    pg_tables
WHERE 
    tablename = 'clients';

-- Drop existing policies to start fresh (safe to run multiple times)
DROP POLICY IF EXISTS "Allow authenticated insert" ON clients;
DROP POLICY IF EXISTS "Allow authenticated select" ON clients;
DROP POLICY IF EXISTS "Allow authenticated update" ON clients;
DROP POLICY IF EXISTS "Allow authenticated delete" ON clients;
DROP POLICY IF EXISTS "Allow anon select" ON clients;
DROP POLICY IF EXISTS "Allow all insert" ON clients;
DROP POLICY IF EXISTS "Allow all select" ON clients;

-- Enable RLS on the table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE PERMISSIVE POLICIES
-- =====================================================

-- Policy 1: Allow authenticated users to INSERT new clients
CREATE POLICY "Allow authenticated insert" ON clients
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Policy 2: Allow authenticated users to SELECT all clients
CREATE POLICY "Allow authenticated select" ON clients
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Allow authenticated users to UPDATE clients
CREATE POLICY "Allow authenticated update" ON clients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Allow authenticated users to DELETE clients
CREATE POLICY "Allow authenticated delete" ON clients
FOR DELETE
TO authenticated
USING (true);

-- Policy 5: Allow anonymous users to SELECT clients (for public portal access)
-- This is needed for the invitation system and public client pages
CREATE POLICY "Allow anon select" ON clients
FOR SELECT
TO anon
USING (portal_access = true);

-- =====================================================
-- FOR DEVELOPMENT/TESTING ONLY
-- If you still have issues, temporarily allow all operations
-- REMOVE THESE IN PRODUCTION!
-- =====================================================

-- Uncomment these lines if you need completely open access for testing:
/*
DROP POLICY IF EXISTS "Allow all operations" ON clients;
CREATE POLICY "Allow all operations" ON clients
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
*/

-- =====================================================
-- VERIFY POLICIES
-- =====================================================

-- Check all policies on the clients table
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
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
    END as roles,
    pol.polqual as using_expression,
    pol.polwithcheck as with_check_expression
FROM 
    pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE 
    cls.relname = 'clients'
ORDER BY 
    pol.polname;

-- =====================================================
-- TEST THE POLICIES
-- =====================================================

-- Test if authenticated users can insert (this should succeed after running the policies)
-- Note: This is just a test query structure, it won't actually run in SQL editor
/*
Example test in your app:
INSERT INTO clients (name, email, company) 
VALUES ('Test Client', 'test@example.com', 'Test Company');
*/

-- Success message
SELECT '✅ Row Level Security policies have been configured for the clients table!' as message,
       'Authenticated users can now: INSERT, SELECT, UPDATE, DELETE clients' as permissions,
       'Anonymous users can: SELECT clients with portal_access = true' as public_access;

-- =====================================================
-- ADDITIONAL CHECKS
-- =====================================================

-- Check if there are any other tables that might need RLS configuration
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '⚠️ RLS Disabled'
    END as status
FROM 
    pg_tables
WHERE 
    schemaname = 'public'
    AND tablename IN (
        'clients', 
        'generated_content', 
        'content_ideas', 
        'users',
        'admin_sessions',
        'user_prompt_overrides'
    )
ORDER BY 
    tablename;