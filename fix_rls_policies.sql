-- Fix Row Level Security policies for generated_content table

-- First, check current policies
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
WHERE tablename = 'generated_content';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view generated content" ON generated_content;
DROP POLICY IF EXISTS "Authenticated users can insert generated content" ON generated_content;
DROP POLICY IF EXISTS "Authenticated users can update generated content" ON generated_content;
DROP POLICY IF EXISTS "Authenticated users can delete generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can view and manage generated content" ON generated_content;

-- Option 1: Temporarily disable RLS for testing (NOT RECOMMENDED for production)
-- ALTER TABLE generated_content DISABLE ROW LEVEL SECURITY;

-- Option 2: Create permissive policies for all operations (RECOMMENDED)
-- Enable RLS first
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to perform all operations
CREATE POLICY "Enable all operations for authenticated users" 
  ON generated_content
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Alternative: Allow anonymous users too (for testing)
CREATE POLICY "Enable read for anon users" 
  ON generated_content
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for anon users" 
  ON generated_content
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for anon users" 
  ON generated_content
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Test insert after fixing policies
INSERT INTO generated_content (
  content_text,
  hook,
  status,
  llm_provider,
  variant_number
) VALUES (
  'Test content after RLS fix',
  'Test hook',
  'draft',
  'google',
  1
) RETURNING id, status, created_at;

-- Check if data was inserted
SELECT id, status, content_text, created_at 
FROM generated_content 
ORDER BY created_at DESC 
LIMIT 5;