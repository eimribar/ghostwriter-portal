-- ========================================
-- ENHANCED PROMPT MANAGEMENT SCHEMA
-- ========================================
-- Additional fields and features for the prompt templates table
-- Run this in Supabase SQL Editor after create_prompt_templates_table.sql
-- ========================================

-- Step 1: Add new columns to prompt_templates for enhanced features
DO $$ 
BEGIN
    -- Add output_format field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'output_format') THEN
        ALTER TABLE prompt_templates ADD COLUMN output_format TEXT DEFAULT 'paragraph';
        COMMENT ON COLUMN prompt_templates.output_format IS 'Expected output format: paragraph, list, bullets, json, markdown';
    END IF;
    
    -- Add tone_preset field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'tone_preset') THEN
        ALTER TABLE prompt_templates ADD COLUMN tone_preset TEXT DEFAULT 'professional';
        COMMENT ON COLUMN prompt_templates.tone_preset IS 'Tone preset: professional, casual, technical, inspirational, friendly';
    END IF;
    
    -- Add length_preset field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'length_preset') THEN
        ALTER TABLE prompt_templates ADD COLUMN length_preset TEXT DEFAULT 'medium';
        COMMENT ON COLUMN prompt_templates.length_preset IS 'Length preset: short, medium, long, custom';
    END IF;
    
    -- Add variables_schema field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'variables_schema') THEN
        ALTER TABLE prompt_templates ADD COLUMN variables_schema JSONB;
        COMMENT ON COLUMN prompt_templates.variables_schema IS 'JSON schema defining required and optional variables';
    END IF;
    
    -- Add last_tested_at field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'last_tested_at') THEN
        ALTER TABLE prompt_templates ADD COLUMN last_tested_at TIMESTAMPTZ;
        COMMENT ON COLUMN prompt_templates.last_tested_at IS 'When this prompt was last tested';
    END IF;
    
    -- Add average_response_time field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'average_response_time') THEN
        ALTER TABLE prompt_templates ADD COLUMN average_response_time INTEGER;
        COMMENT ON COLUMN prompt_templates.average_response_time IS 'Average response time in milliseconds';
    END IF;
    
    -- Add is_favorite field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'is_favorite') THEN
        ALTER TABLE prompt_templates ADD COLUMN is_favorite BOOLEAN DEFAULT false;
        COMMENT ON COLUMN prompt_templates.is_favorite IS 'Mark prompt as favorite for quick access';
    END IF;
END $$;

-- Step 2: Create prompt_test_results table for tracking test results
CREATE TABLE IF NOT EXISTS prompt_test_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_template_id UUID REFERENCES prompt_templates(id) ON DELETE CASCADE,
    test_input TEXT NOT NULL,
    test_output TEXT NOT NULL,
    response_time_ms INTEGER,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    notes TEXT,
    tested_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_prompt_templates_output_format ON prompt_templates(output_format);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tone_preset ON prompt_templates(tone_preset);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_length_preset ON prompt_templates(length_preset);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_favorite ON prompt_templates(is_favorite);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_last_tested ON prompt_templates(last_tested_at DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_test_results_template_id ON prompt_test_results(prompt_template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_created_at ON prompt_test_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_rating ON prompt_test_results(quality_rating DESC);

-- Step 4: Enable RLS for test results
ALTER TABLE prompt_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read test results" ON prompt_test_results
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can manage test results" ON prompt_test_results
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 5: Grant permissions
GRANT ALL ON prompt_test_results TO anon;
GRANT ALL ON prompt_test_results TO authenticated;
GRANT ALL ON prompt_test_results TO service_role;

-- Step 6: Create prompt_collections table for organizing prompts
CREATE TABLE IF NOT EXISTS prompt_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6', -- Blue color
    icon TEXT DEFAULT 'folder',
    is_shared BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Create junction table for prompt collections
CREATE TABLE IF NOT EXISTS prompt_collection_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES prompt_collections(id) ON DELETE CASCADE,
    prompt_id UUID REFERENCES prompt_templates(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, prompt_id)
);

-- Step 8: Enable RLS for collections
ALTER TABLE prompt_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read collections" ON prompt_collections FOR SELECT USING (true);
CREATE POLICY "Anyone can manage collections" ON prompt_collections FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read collection items" ON prompt_collection_items FOR SELECT USING (true);
CREATE POLICY "Anyone can manage collection items" ON prompt_collection_items FOR ALL USING (true) WITH CHECK (true);

-- Step 9: Grant permissions for collections
GRANT ALL ON prompt_collections TO anon;
GRANT ALL ON prompt_collections TO authenticated;
GRANT ALL ON prompt_collections TO service_role;

GRANT ALL ON prompt_collection_items TO anon;
GRANT ALL ON prompt_collection_items TO authenticated;
GRANT ALL ON prompt_collection_items TO service_role;

-- Step 10: Update existing prompts with enhanced LinkedIn prompts from hardcoded data
-- This replaces the hardcoded prompts with proper database entries
INSERT INTO prompt_templates (
    name, 
    category, 
    description, 
    system_message, 
    provider, 
    model, 
    tags, 
    settings, 
    is_active, 
    is_default,
    output_format,
    tone_preset,
    length_preset
) VALUES 
(
    'RevOps & Technical Focus',
    'Content Generation',
    'Technical and RevOps focused LinkedIn posts with data-driven insights',
    'You are a writing agent whose sole responsibility is to craft high-performing, engaging, and thought-provoking LinkedIn posts based on a keyword, content idea, or brief that I will provide.

Your goal is to generate new posts that are pixel-perfect replicas — in voice, tone, structure, pacing, hook, and overall style — of the post examples provided here.

Post examples:

"Our RevOps AI is the least glamorous agent we''re building. It might also be the one with the biggest impact on revenue.

It doesn''t write copy. It doesn''t design ads. It doesn''t chat with prospects.

It just does the insanely valuable, tedious work that no one really wants to do:

- Connects our CRM, billing, and product usage data
- Flags accounts with low engagement 90 days before renewal
- Cleans and enriches lead data before it hits sales
- Automates our pipeline forecasting
- Finds upsell opportunities based on product usage patterns

The creative AIs get all the attention.

But the agent that just quietly makes the data trustworthy… that's the one that makes everything else possible."

Write with authentic expertise and direct communication. Use confident, straightforward language demonstrating real experience. Avoid corporate jargon and marketing-speak.',
    'google',
    'gemini-2.5-pro',
    ARRAY['linkedin', 'revops', 'technical', 'b2b', 'saas', 'data-driven'],
    '{
        "temperature": 1.5,
        "max_tokens": 1048576,
        "top_p": 0.95
    }'::jsonb,
    true,
    true,
    'paragraph',
    'professional',
    'medium'
),
(
    'SaaStr & Management Focus',
    'Content Generation', 
    'SaaStr-style management and leadership focused content',
    'You are a writing agent crafting SaaStr-style LinkedIn posts about management, leadership, and building teams.

Focus on:
- Real experiences from building companies
- Honest takes on leadership challenges
- Practical advice for managers and executives
- Stories about hiring, firing, and team building
- Insights about scaling from startup to enterprise

Write with the voice of an experienced operator who has been through the trenches. Be direct, practical, and authentic. Share specific examples and lessons learned.',
    'google',
    'gemini-2.5-pro', 
    ARRAY['linkedin', 'management', 'leadership', 'saas', 'startup', 'team-building'],
    '{
        "temperature": 1.4,
        "max_tokens": 1048576,
        "top_p": 0.9
    }'::jsonb,
    true,
    false,
    'paragraph',
    'professional',
    'medium'
),
(
    'Sales Excellence Focus',
    'Content Generation',
    'Sales methodology and excellence focused content for top performers',
    'You are a writing agent creating content about sales excellence, methodology, and high performance.

Focus on:
- Sales techniques that actually work
- Common sales myths vs reality
- How top performers think differently
- Specific tactics for different sales scenarios
- Leadership lessons for sales managers
- Process improvements and systematization

Write from the perspective of someone who has consistently hit quota and managed high-performing teams. Be specific with examples and actionable advice.',
    'google',
    'gemini-2.5-pro',
    ARRAY['linkedin', 'sales', 'methodology', 'performance', 'leadership', 'quotas'],
    '{
        "temperature": 1.3,
        "max_tokens": 1048576,
        "top_p": 0.92
    }'::jsonb,
    true,
    false,
    'list',
    'professional',
    'long'
),
(
    'Data & Analytics Focus',
    'Content Generation',
    'Data-driven insights and analytical content with specific numbers and trends',
    'You are a writing agent creating data-driven LinkedIn content with specific metrics, trends, and analytical insights.

Focus on:
- Specific numbers and statistics
- Market analysis and trends  
- Comparative data between companies/industries
- Growth metrics and benchmarks
- Data-backed predictions and insights
- Breaking down complex data into understandable insights

Always include specific numbers, percentages, and data points. Structure content with clear sections and bullet points. Cite trends and make data-driven conclusions.',
    'google', 
    'gemini-2.5-pro',
    ARRAY['linkedin', 'data', 'analytics', 'metrics', 'trends', 'insights'],
    '{
        "temperature": 1.2,
        "max_tokens": 1048576,
        "top_p": 0.88
    }'::jsonb,
    true,
    false,
    'list',
    'technical',
    'long'
) ON CONFLICT (name) DO NOTHING;

-- Step 11: Create a default "LinkedIn Content" collection
INSERT INTO prompt_collections (name, description, color, icon, is_shared)
VALUES (
    'LinkedIn Content Templates',
    'Core LinkedIn content generation prompts for different styles and approaches',
    '#0077B5',
    'linkedin',
    true
) ON CONFLICT DO NOTHING;

-- Step 12: Add LinkedIn prompts to the default collection
INSERT INTO prompt_collection_items (collection_id, prompt_id)
SELECT 
    pc.id,
    pt.id
FROM prompt_collections pc
CROSS JOIN prompt_templates pt
WHERE pc.name = 'LinkedIn Content Templates'
AND pt.category = 'Content Generation'
ON CONFLICT (collection_id, prompt_id) DO NOTHING;

-- Step 13: Create a view for enhanced prompt statistics
CREATE OR REPLACE VIEW enhanced_prompt_stats AS
SELECT 
    pt.id,
    pt.name,
    pt.category,
    pt.provider,
    pt.is_favorite,
    pt.usage_count,
    pt.success_rate,
    pt.last_tested_at,
    pt.average_response_time,
    COUNT(ptr.id) as test_count,
    AVG(ptr.quality_rating) as avg_test_rating,
    MAX(ptr.created_at) as last_test_date,
    pt.created_at,
    pt.updated_at
FROM prompt_templates pt
LEFT JOIN prompt_test_results ptr ON pt.id = ptr.prompt_template_id
GROUP BY pt.id, pt.name, pt.category, pt.provider, pt.is_favorite, pt.usage_count, pt.success_rate, pt.last_tested_at, pt.average_response_time, pt.created_at, pt.updated_at;

-- Step 14: Success message
SELECT '✅ Enhanced prompt management schema created successfully!' as status,
       'Added new fields, test results tracking, collections, and LinkedIn templates' as message;