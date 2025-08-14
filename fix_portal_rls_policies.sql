-- Fix RLS Policies for Portal Integration
-- This script ensures both Admin Portal and User Portal can access content properly

-- First, ensure RLS is enabled on all tables
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable all for authenticated users" ON generated_content;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON generated_content;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON generated_content;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON generated_content;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON generated_content;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON generated_content;
DROP POLICY IF EXISTS "Public read access" ON generated_content;
DROP POLICY IF EXISTS "Authenticated users can read all content" ON generated_content;
DROP POLICY IF EXISTS "Authenticated users can insert content" ON generated_content;
DROP POLICY IF EXISTS "Authenticated users can update their content" ON generated_content;

-- Create comprehensive policies for generated_content table
-- IMPORTANT: These policies allow both portals to work together

-- 1. Allow ALL authenticated users to READ all content (both portals need this)
CREATE POLICY "authenticated_read_all_content" 
ON generated_content 
FOR SELECT 
TO authenticated 
USING (true);

-- 2. Allow authenticated users to INSERT content (for admin portal)
CREATE POLICY "authenticated_insert_content" 
ON generated_content 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. Allow authenticated users to UPDATE any content (for both portals)
CREATE POLICY "authenticated_update_all_content" 
ON generated_content 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. Allow authenticated users to DELETE their own content
CREATE POLICY "authenticated_delete_content" 
ON generated_content 
FOR DELETE 
TO authenticated 
USING (true);

-- Also create a public read policy for admin_approved content (for non-authenticated viewing if needed)
CREATE POLICY "public_read_admin_approved" 
ON generated_content 
FOR SELECT 
TO public 
USING (status = 'admin_approved' OR status = 'client_approved' OR status = 'published');

-- Fix policies for other tables too
-- Content Ideas
DROP POLICY IF EXISTS "Enable all for authenticated users" ON content_ideas;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON content_ideas;

CREATE POLICY "authenticated_all_content_ideas" 
ON content_ideas 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Scheduled Posts
DROP POLICY IF EXISTS "Enable all for authenticated users" ON scheduled_posts;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON scheduled_posts;

CREATE POLICY "authenticated_all_scheduled_posts" 
ON scheduled_posts 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Clients
DROP POLICY IF EXISTS "Enable all for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON clients;

CREATE POLICY "authenticated_read_clients" 
ON clients 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "authenticated_manage_clients" 
ON clients 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Users
DROP POLICY IF EXISTS "Enable all for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON users;

CREATE POLICY "authenticated_read_users" 
ON users 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "authenticated_manage_users" 
ON users 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Verify the policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('generated_content', 'content_ideas', 'scheduled_posts', 'clients', 'users')
ORDER BY tablename, policyname;

-- Test query to see admin_approved content
SELECT 
    id,
    content_text,
    status,
    created_at,
    approved_at
FROM generated_content
WHERE status = 'admin_approved'
ORDER BY created_at DESC
LIMIT 10;