-- Quick Test Data Setup
-- Run this in Supabase SQL Editor to bypass RLS

-- Temporarily disable RLS for setup
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content DISABLE ROW LEVEL SECURITY;

-- Insert test clients
INSERT INTO clients (id, name, company, email, industry, status) 
VALUES 
    ('550e8400-e29b-41d4-a716-446655440005', 'Demo Client', 'Demo Company', 'demo@example.com', 'General', 'active')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, company = EXCLUDED.company, status = 'active';

-- Insert test content idea
INSERT INTO content_ideas (id, client_id, title, description, source, priority, status)
VALUES
    ('770e8400-e29b-41d4-a716-446655440001', 
     '550e8400-e29b-41d4-a716-446655440005',
     'AI in Customer Service',
     'How artificial intelligence is revolutionizing customer support',
     'manual',
     'high',
     'draft')
ON CONFLICT (id) DO NOTHING;

-- Insert sample generated content - one draft, one admin_approved
INSERT INTO generated_content (
    idea_id, client_id, variant_number, content_text, hook, 
    hashtags, estimated_read_time, llm_provider, llm_model, 
    generation_prompt, status
) VALUES 
(
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440005',
    1,
    '🤖 The AI Revolution in Customer Service

Did you know that 80% of customer inquiries can now be handled by AI?

The winning formula:
• AI handles routine queries
• Humans focus on complex situations
• Result: 40% faster resolution

What''s your take on AI in customer service?

#CustomerService #AI #Innovation',
    'The AI Revolution in Customer Service',
    ARRAY['CustomerService', 'AI', 'Innovation'],
    1,
    'google',
    'gemini-2.5-pro',
    'AI in Customer Service',
    'draft'
),
(
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440005',
    2,
    'We replaced our entire customer service team with AI.

It was a disaster. Here''s what we learned:

Month 1: 50% cost reduction!
Month 2: Customer complaints up 300%
Month 3: Lost 20% of clients

The lesson? AI amplifies human capability. It doesn''t replace it.

#CustomerSuccess #AILessons #Leadership',
    'We replaced our entire customer service team with AI',
    ARRAY['CustomerSuccess', 'AILessons', 'Leadership'],
    1,
    'google',
    'gemini-2.5-pro',
    'AI in Customer Service',
    'admin_approved'
);

-- Re-enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for testing
DROP POLICY IF EXISTS "Allow all for testing" ON clients;
CREATE POLICY "Allow all for testing" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for testing" ON generated_content;
CREATE POLICY "Allow all for testing" ON generated_content FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for testing" ON content_ideas;
CREATE POLICY "Allow all for testing" ON content_ideas FOR ALL USING (true) WITH CHECK (true);

-- Verify the data
SELECT 'Test Data Summary:' as info;
SELECT COUNT(*) as client_count FROM clients WHERE status = 'active';
SELECT COUNT(*) as draft_posts FROM generated_content WHERE status = 'draft';
SELECT COUNT(*) as admin_approved_posts FROM generated_content WHERE status = 'admin_approved';