-- Fix Approval Flow - Test Data
-- This script sets up test data to verify the approval flow is working

-- First, ensure the generated_content table has the correct status constraint
ALTER TABLE generated_content 
DROP CONSTRAINT IF EXISTS generated_content_status_check;

ALTER TABLE generated_content 
ADD CONSTRAINT generated_content_status_check 
CHECK (status IN ('draft', 'admin_approved', 'admin_rejected', 'client_approved', 'client_rejected', 'scheduled', 'published'));

-- Temporarily disable RLS for setup
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts DISABLE ROW LEVEL SECURITY;

-- Clear existing test data
DELETE FROM scheduled_posts WHERE client_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM generated_content WHERE client_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM content_ideas WHERE client_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM clients WHERE id = '00000000-0000-0000-0000-000000000001';

-- Insert a simple test client (no user dependency)
INSERT INTO clients (id, name, company, email, industry, status) 
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Test Client', 'Test Company', 'test@example.com', 'Testing', 'active');

-- Insert a test content idea
INSERT INTO content_ideas (id, client_id, title, description, source, priority, status)
VALUES
    ('00000000-0000-0000-0000-000000000002', 
     '00000000-0000-0000-0000-000000000001',
     'Test Content Idea',
     'This is a test idea for approval flow testing',
     'manual',
     'high',
     'draft');

-- Insert test generated content with different statuses
INSERT INTO generated_content (
    id,
    idea_id, 
    client_id, 
    variant_number, 
    content_text, 
    hook, 
    hashtags, 
    estimated_read_time, 
    llm_provider, 
    llm_model, 
    generation_prompt, 
    status
) VALUES 
-- Draft content (needs admin approval)
(
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    1,
    '🚀 DRAFT POST - Ready for Admin Review

This is a test post in DRAFT status.
It should appear in the Ghostwriter Portal approval queue.

When approved by admin, it will move to admin_approved status.

#TestPost #ApprovalFlow #Draft',
    'DRAFT POST - Ready for Admin Review',
    ARRAY['TestPost', 'ApprovalFlow', 'Draft'],
    1,
    'google',
    'gemini-2.5-pro',
    'Test approval flow',
    'draft'
),
-- Admin approved content (ready for client approval)
(
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    2,
    '✅ ADMIN APPROVED - Ready for Client Review

This post has been approved by the admin.
It should appear in the User Portal approval queue.

When the client approves, it will move to client_approved status.

#TestPost #AdminApproved #ClientReview',
    'ADMIN APPROVED - Ready for Client Review',
    ARRAY['TestPost', 'AdminApproved', 'ClientReview'],
    1,
    'google',
    'gemini-2.5-pro',
    'Test approval flow',
    'admin_approved'
),
-- Client approved content (ready for scheduling)
(
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    3,
    '🎯 CLIENT APPROVED - Ready for Scheduling

This post has been approved by both admin and client.
It''s ready to be scheduled for publication.

This demonstrates the complete approval flow working correctly!

#TestPost #ClientApproved #Success',
    'CLIENT APPROVED - Ready for Scheduling',
    ARRAY['TestPost', 'ClientApproved', 'Success'],
    1,
    'google',
    'gemini-2.5-pro',
    'Test approval flow',
    'client_approved'
);

-- Re-enable RLS with permissive policies for testing
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for testing
DROP POLICY IF EXISTS "Allow all for testing" ON clients;
CREATE POLICY "Allow all for testing" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for testing" ON generated_content;
CREATE POLICY "Allow all for testing" ON generated_content FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for testing" ON content_ideas;
CREATE POLICY "Allow all for testing" ON content_ideas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for testing" ON scheduled_posts;
CREATE POLICY "Allow all for testing" ON scheduled_posts FOR ALL USING (true) WITH CHECK (true);

-- Verify the test data
SELECT 'Test Data Created Successfully!' as message;
SELECT '================================' as divider;
SELECT 'Client: Test Company' as info;
SELECT COUNT(*) as draft_posts FROM generated_content WHERE status = 'draft' AND client_id = '00000000-0000-0000-0000-000000000001';
SELECT COUNT(*) as admin_approved_posts FROM generated_content WHERE status = 'admin_approved' AND client_id = '00000000-0000-0000-0000-000000000001';
SELECT COUNT(*) as client_approved_posts FROM generated_content WHERE status = 'client_approved' AND client_id = '00000000-0000-0000-0000-000000000001';

-- Show the actual posts
SELECT '================================' as divider;
SELECT 'Posts by Status:' as info;
SELECT id, variant_number, status, hook FROM generated_content 
WHERE client_id = '00000000-0000-0000-0000-000000000001' 
ORDER BY variant_number;