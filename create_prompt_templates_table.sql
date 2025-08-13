-- ========================================
-- PROMPT TEMPLATES TABLE FOR GHOSTWRITER PORTAL
-- ========================================
-- This creates a comprehensive prompt management system
-- Run this in Supabase SQL Editor
-- ========================================

-- Step 1: Create the prompt_templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- LinkedIn, Email, Blog, Twitter, Cold Outreach, etc.
    description TEXT,
    system_message TEXT NOT NULL, -- The actual prompt content
    examples JSONB, -- Array of example outputs
    variables JSONB, -- Dynamic variables like {{client_name}}, {{industry}}
    settings JSONB, -- Temperature, max_tokens, top_p, etc.
    provider TEXT DEFAULT 'google', -- openai, anthropic, google
    model TEXT, -- Specific model version
    tags TEXT[], -- For filtering and organization
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Mark one as default per category
    version INTEGER DEFAULT 1,
    parent_id UUID, -- For version history (references previous version)
    usage_count INTEGER DEFAULT 0, -- Track how often it's used
    success_rate FLOAT, -- Track performance metrics
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX idx_prompt_templates_is_active ON prompt_templates(is_active);
CREATE INDEX idx_prompt_templates_tags ON prompt_templates USING GIN(tags);
CREATE INDEX idx_prompt_templates_created_at ON prompt_templates(created_at DESC);

-- Step 3: Enable RLS
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Step 4: Create permissive policies
CREATE POLICY "Anyone can read active prompts" ON prompt_templates
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Anyone can manage prompts" ON prompt_templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 5: Grant permissions
GRANT ALL ON prompt_templates TO anon;
GRANT ALL ON prompt_templates TO authenticated;
GRANT ALL ON prompt_templates TO service_role;

-- Step 6: Create a prompt usage history table
CREATE TABLE IF NOT EXISTS prompt_usage_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_template_id UUID REFERENCES prompt_templates(id),
    used_by UUID,
    input_data JSONB, -- What was sent to the prompt
    output_data JSONB, -- What was generated
    feedback TEXT, -- User feedback on quality
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Create indexes for usage history
CREATE INDEX idx_prompt_usage_prompt_id ON prompt_usage_history(prompt_template_id);
CREATE INDEX idx_prompt_usage_created_at ON prompt_usage_history(created_at DESC);

-- Step 8: Enable RLS for usage history
ALTER TABLE prompt_usage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage usage history" ON prompt_usage_history
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 9: Grant permissions for usage history
GRANT ALL ON prompt_usage_history TO anon;
GRANT ALL ON prompt_usage_history TO authenticated;
GRANT ALL ON prompt_usage_history TO service_role;

-- Step 10: Import the first LinkedIn prompt as an example
INSERT INTO prompt_templates (
    name,
    category,
    description,
    system_message,
    examples,
    variables,
    settings,
    provider,
    model,
    tags,
    is_active,
    is_default
) VALUES (
    'RevOps & Technical Focus',
    'LinkedIn',
    'Technical and RevOps focused LinkedIn posts with data-driven insights',
    'You are a writing agent whose sole responsibility is to craft high-performing, engaging, and thought-provoking LinkedIn posts based on a keyword, content idea, or brief that I will provide.

Your goal is to generate new posts that are pixel-perfect replicas — in voice, tone, structure, pacing, hook, and overall style — of the post examples provided.

Write with authentic expertise and direct communication. Use confident, straightforward language demonstrating real experience. Avoid corporate jargon and marketing-speak.',
    '["Our RevOps AI is the least glamorous agent we''re building...", "Why this is the GREATEST time to be building a software startup..."]'::jsonb,
    '{
        "client_name": "Client company name",
        "industry": "Client industry",
        "tone": "Professional, technical, data-driven",
        "topic": "Main topic or keyword"
    }'::jsonb,
    '{
        "temperature": 1.5,
        "max_tokens": 1000,
        "top_p": 0.95,
        "frequency_penalty": 0.3,
        "presence_penalty": 0.3
    }'::jsonb,
    'google',
    'gemini-2.5-pro',
    ARRAY['linkedin', 'revops', 'technical', 'b2b', 'saas'],
    true,
    true
);

-- Step 11: Add more template categories
INSERT INTO prompt_templates (name, category, description, system_message, provider, tags, is_active)
VALUES 
    ('Email Cold Outreach', 'Email', 'Professional cold outreach emails', 'Write professional cold outreach emails...', 'openai', ARRAY['email', 'outreach', 'sales'], true),
    ('Blog Post Intro', 'Blog', 'Engaging blog post introductions', 'Create compelling blog post introductions...', 'anthropic', ARRAY['blog', 'content', 'seo'], true),
    ('Twitter Thread', 'Twitter', 'Viral Twitter thread creator', 'Create engaging Twitter threads...', 'google', ARRAY['twitter', 'social', 'viral'], true);

-- Step 12: Create a view for prompt statistics
CREATE OR REPLACE VIEW prompt_template_stats AS
SELECT 
    pt.id,
    pt.name,
    pt.category,
    pt.usage_count,
    COUNT(puh.id) as total_uses,
    AVG(puh.rating) as avg_rating,
    pt.created_at,
    pt.updated_at
FROM prompt_templates pt
LEFT JOIN prompt_usage_history puh ON pt.id = puh.prompt_template_id
GROUP BY pt.id, pt.name, pt.category, pt.usage_count, pt.created_at, pt.updated_at;

-- Step 13: Success message
SELECT '✅ Prompt Templates system created successfully!' as status,
       'You can now manage all your AI prompts from the admin portal' as message;