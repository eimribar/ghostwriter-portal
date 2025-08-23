-- =====================================================
-- FIX RLS FOR ANON ACCESS (DEVELOPMENT)
-- Allows anonymous users to create clients
-- This is needed when using Supabase anon key without auth
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anon insert" ON clients;
DROP POLICY IF EXISTS "Allow anon update" ON clients;
DROP POLICY IF EXISTS "Allow anon delete" ON clients;
DROP POLICY IF EXISTS "Allow public operations" ON clients;

-- =====================================================
-- OPTION 1: Add anon role to existing policies (RECOMMENDED)
-- =====================================================

-- Allow anonymous users to INSERT (needed for client onboarding without auth)
CREATE POLICY "Allow anon insert" ON clients
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow anonymous users to UPDATE (for client management)
CREATE POLICY "Allow anon update" ON clients
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous users to DELETE (for testing)
CREATE POLICY "Allow anon delete" ON clients
FOR DELETE
TO anon
USING (true);

-- =====================================================
-- OPTION 2: Create a single permissive policy for all operations
-- Uncomment if Option 1 doesn't work
-- =====================================================

/*
-- Drop all existing policies first
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'clients' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON clients', pol.policyname);
    END LOOP;
END $$;

-- Create one policy that allows everything for both anon and authenticated
CREATE POLICY "Allow all operations" ON clients
FOR ALL
USING (true)
WITH CHECK (true);
*/

-- =====================================================
-- OPTION 3: Disable RLS entirely (LAST RESORT - DEVELOPMENT ONLY!)
-- Only use this if nothing else works
-- =====================================================

/*
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
*/

-- =====================================================
-- VERIFY THE POLICIES
-- =====================================================

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
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END as operation
FROM 
    pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE 
    cls.relname = 'clients'
ORDER BY 
    pol.polname;

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
    tablename = 'clients';

-- Success message
SELECT 
    '✅ Anonymous access has been granted to the clients table!' as message,
    'The anon role can now INSERT, UPDATE, DELETE, and SELECT clients' as permissions,
    '⚠️ Remember to tighten security before going to production!' as warning;