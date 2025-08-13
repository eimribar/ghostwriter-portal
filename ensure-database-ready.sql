-- Ensure Database is Ready for Approval Flow
-- Run this in Supabase SQL Editor to ensure everything works

-- 1. Ensure generated_content table exists with correct columns
CREATE TABLE IF NOT EXISTS generated_content (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    idea_id UUID,
    client_id UUID,
    ghostwriter_id UUID,
    user_id UUID,
    variant_number INTEGER,
    content_text TEXT NOT NULL,
    hook TEXT,
    hashtags TEXT[],
    estimated_read_time INTEGER,
    llm_provider TEXT,
    llm_model TEXT,
    generation_prompt TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'admin_approved', 'admin_rejected', 'client_approved', 'client_rejected', 'scheduled', 'published')),
    revision_notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ensure scheduled_posts table exists
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content_id UUID,
    client_id UUID,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    platform TEXT,
    status TEXT DEFAULT 'scheduled',
    published_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable RLS but make it permissive for testing
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- 4. Drop any restrictive policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON generated_content;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON generated_content;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON generated_content;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON generated_content;

-- 5. Create completely permissive policies for testing
CREATE POLICY "Allow all operations" ON generated_content
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON scheduled_posts
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);
CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);

-- 7. Test by inserting a sample post
INSERT INTO generated_content (
    content_text,
    hook,
    status,
    variant_number,
    llm_provider,
    llm_model
) VALUES (
    'TEST POST: If you see this in the approval queue, the database is working!',
    'TEST POST',
    'draft',
    999,
    'test',
    'test'
);

-- 8. Verify it worked
SELECT COUNT(*) as test_posts FROM generated_content WHERE variant_number = 999;

-- Success message
SELECT 'Database is ready! You should see 1 test post in the approval queue.' as message;