-- ========================================
-- FIX PROMPT TEMPLATES TABLE
-- ========================================
-- This script fixes the prompt_templates table structure
-- Run this BEFORE populate_prompts.sql
-- ========================================

-- Step 1: Drop existing table and related objects if they exist
DROP VIEW IF EXISTS prompt_template_stats CASCADE;
DROP TABLE IF EXISTS prompt_usage_history CASCADE;
DROP TABLE IF EXISTS prompt_templates CASCADE;

-- Step 2: Create the prompt_templates table with ALL columns
CREATE TABLE prompt_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    system_message TEXT NOT NULL,
    examples JSONB,
    variables JSONB,
    settings JSONB,
    provider TEXT DEFAULT 'google',
    model TEXT,
    tags TEXT[], -- Array of tags for filtering
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    parent_id UUID,
    usage_count INTEGER DEFAULT 0,
    success_rate FLOAT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_active ON prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tags ON prompt_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_at ON prompt_templates(created_at DESC);

-- Step 4: Enable RLS
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Step 5: Create permissive policies
DROP POLICY IF EXISTS "Anyone can read active prompts" ON prompt_templates;
CREATE POLICY "Anyone can read active prompts" ON prompt_templates
    FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can manage prompts" ON prompt_templates;
CREATE POLICY "Anyone can manage prompts" ON prompt_templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 6: Grant permissions
GRANT ALL ON prompt_templates TO anon;
GRANT ALL ON prompt_templates TO authenticated;
GRANT ALL ON prompt_templates TO service_role;

-- Step 7: Create prompt usage history table
CREATE TABLE prompt_usage_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_template_id UUID REFERENCES prompt_templates(id) ON DELETE CASCADE,
    used_by UUID,
    input_data JSONB,
    output_data JSONB,
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 8: Create indexes for usage history
CREATE INDEX IF NOT EXISTS idx_prompt_usage_prompt_id ON prompt_usage_history(prompt_template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_usage_created_at ON prompt_usage_history(created_at DESC);

-- Step 9: Enable RLS for usage history
ALTER TABLE prompt_usage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can manage usage history" ON prompt_usage_history;
CREATE POLICY "Anyone can manage usage history" ON prompt_usage_history
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 10: Grant permissions for usage history
GRANT ALL ON prompt_usage_history TO anon;
GRANT ALL ON prompt_usage_history TO authenticated;
GRANT ALL ON prompt_usage_history TO service_role;

-- Step 11: Create the statistics view
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

-- Step 12: Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'prompt_templates'
ORDER BY ordinal_position;

-- Step 13: Success message
SELECT 
    '✅ Prompt Templates table fixed!' as status,
    'Now run populate_prompts.sql to add the actual prompts' as next_step;