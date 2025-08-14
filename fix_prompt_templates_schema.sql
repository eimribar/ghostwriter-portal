-- Fix prompt_templates table schema
-- This script ensures all required columns exist

-- First, let's check the current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'prompt_templates'
ORDER BY ordinal_position;

-- If the table is missing or has issues, recreate it properly
-- But first, backup existing data if any
CREATE TABLE IF NOT EXISTS prompt_templates_backup AS 
SELECT * FROM prompt_templates WHERE 1=1;

-- Drop the problematic table
DROP TABLE IF EXISTS prompt_templates CASCADE;

-- Recreate with proper schema
CREATE TABLE prompt_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    system_message TEXT NOT NULL,
    examples JSONB,
    variables JSONB,
    settings JSONB DEFAULT '{"temperature": 1.5, "max_tokens": 1048576, "top_p": 0.95}'::jsonb,
    provider TEXT DEFAULT 'google',
    model TEXT DEFAULT 'gemini-2.5-pro',
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX idx_prompt_templates_is_active ON prompt_templates(is_active);
CREATE INDEX idx_prompt_templates_provider ON prompt_templates(provider);
CREATE INDEX idx_prompt_templates_tags ON prompt_templates USING GIN(tags);

-- Enable RLS
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies that allow everything for authenticated users
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON prompt_templates;
CREATE POLICY "Allow all operations for authenticated users" 
ON prompt_templates 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Also allow public read access
DROP POLICY IF EXISTS "Allow public read access" ON prompt_templates;
CREATE POLICY "Allow public read access" 
ON prompt_templates 
FOR SELECT 
TO public 
USING (true);

-- Restore data from backup if it exists
INSERT INTO prompt_templates (
    name, category, description, system_message, 
    provider, model, tags, is_active, settings
)
SELECT DISTINCT ON (name)
    name, category, description, system_message,
    COALESCE(provider, 'google'),
    COALESCE(model, 'gemini-2.5-pro'),
    COALESCE(tags, '{}'),
    COALESCE(is_active, true),
    COALESCE(settings, '{"temperature": 1.5, "max_tokens": 1048576}'::jsonb)
FROM prompt_templates_backup
WHERE name IS NOT NULL AND system_message IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verify the fix
SELECT COUNT(*) as total_prompts FROM prompt_templates;

-- Clean up backup table (optional - comment out if you want to keep it)
-- DROP TABLE IF EXISTS prompt_templates_backup;