-- ========================================
-- ENHANCED PROMPT MANAGEMENT SCHEMA - SIMPLE VERSION
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
    END IF;
    
    -- Add tone_preset field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'tone_preset') THEN
        ALTER TABLE prompt_templates ADD COLUMN tone_preset TEXT DEFAULT 'professional';
    END IF;
    
    -- Add length_preset field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'length_preset') THEN
        ALTER TABLE prompt_templates ADD COLUMN length_preset TEXT DEFAULT 'medium';
    END IF;
    
    -- Add is_favorite field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'is_favorite') THEN
        ALTER TABLE prompt_templates ADD COLUMN is_favorite BOOLEAN DEFAULT false;
    END IF;
    
    -- Add last_tested_at field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompt_templates' AND column_name = 'last_tested_at') THEN
        ALTER TABLE prompt_templates ADD COLUMN last_tested_at TIMESTAMPTZ;
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
    tested_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_prompt_templates_output_format ON prompt_templates(output_format);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tone_preset ON prompt_templates(tone_preset);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_favorite ON prompt_templates(is_favorite);

CREATE INDEX IF NOT EXISTS idx_prompt_test_results_template_id ON prompt_test_results(prompt_template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_created_at ON prompt_test_results(created_at DESC);

-- Step 4: Enable RLS for test results
ALTER TABLE prompt_test_results ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read test results') THEN
        CREATE POLICY "Anyone can read test results" ON prompt_test_results
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can manage test results') THEN
        CREATE POLICY "Anyone can manage test results" ON prompt_test_results
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Step 6: Grant permissions
GRANT ALL ON prompt_test_results TO anon;
GRANT ALL ON prompt_test_results TO authenticated;
GRANT ALL ON prompt_test_results TO service_role;

-- Step 7: Insert LinkedIn prompts (only if they don't already exist)
DO $$
BEGIN
    -- Check if we already have LinkedIn prompts
    IF NOT EXISTS (SELECT 1 FROM prompt_templates WHERE name = 'RevOps & Technical Focus') THEN
        -- Insert the 4 LinkedIn prompts
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

Post Example:

"Our RevOps AI is the least glamorous agent we''re building. It might also be the one with the biggest impact on revenue.

It doesn''t write copy. It doesn''t design ads. It doesn''t chat with prospects.

It just does the insanely valuable, tedious work that no one really wants to do:

- Connects our CRM, billing, and product usage data
- Flags accounts with low engagement 90 days before renewal  
- Cleans and enriches lead data before it hits sales
- Automates our pipeline forecasting
- Finds upsell opportunities based on product usage patterns

The creative AIs get all the attention.

But the agent that just quietly makes the data trustworthy… that''s the one that makes everything else possible."

Write with authentic expertise and direct communication. Use confident, straightforward language demonstrating real experience. Avoid corporate jargon and marketing-speak.',
            'google',
            'gemini-2.5-pro',
            ARRAY['linkedin', 'revops', 'technical', 'b2b', 'saas', 'data-driven'],
            '{"temperature": 1.5, "max_tokens": 1048576, "top_p": 0.95}'::jsonb,
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
            '{"temperature": 1.4, "max_tokens": 1048576, "top_p": 0.9}'::jsonb,
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
            '{"temperature": 1.3, "max_tokens": 1048576, "top_p": 0.92}'::jsonb,
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
            '{"temperature": 1.2, "max_tokens": 1048576, "top_p": 0.88}'::jsonb,
            true,
            false,
            'list',
            'technical',
            'long'
        );
        
        RAISE NOTICE 'LinkedIn prompt templates created successfully!';
    ELSE
        RAISE NOTICE 'LinkedIn prompt templates already exist, skipping creation.';
    END IF;
END $$;

-- Step 8: Success message
SELECT '✅ Enhanced prompt management schema created successfully!' as status,
       'Added new fields, test results tracking, and LinkedIn templates' as message;