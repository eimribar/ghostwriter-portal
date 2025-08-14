-- Fix RLS policies for content_ideas table
-- This allows anonymous users to insert and read content ideas

-- First, check if RLS is enabled (it probably is)
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON content_ideas;
DROP POLICY IF EXISTS "Enable insert for all users" ON content_ideas;
DROP POLICY IF EXISTS "Enable update for all users" ON content_ideas;
DROP POLICY IF EXISTS "Enable delete for all users" ON content_ideas;

-- Create new policies that allow anonymous access
-- Since we're not using authentication yet, we'll allow all operations

-- Allow anyone to read content ideas
CREATE POLICY "Enable read access for all users" ON content_ideas
    FOR SELECT 
    USING (true);

-- Allow anyone to insert content ideas
CREATE POLICY "Enable insert for all users" ON content_ideas
    FOR INSERT 
    WITH CHECK (true);

-- Allow anyone to update their own content ideas
CREATE POLICY "Enable update for all users" ON content_ideas
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);

-- Allow anyone to delete content ideas (be careful with this in production)
CREATE POLICY "Enable delete for all users" ON content_ideas
    FOR DELETE 
    USING (true);

-- Also ensure active_content_ideas view works
-- Since it's a view, it inherits the policies from the base table