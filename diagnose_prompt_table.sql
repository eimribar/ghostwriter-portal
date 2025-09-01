-- =====================================================
-- DIAGNOSE PROMPT TEMPLATES TABLE STRUCTURE
-- Run this first to see the actual column names
-- =====================================================

-- Show all columns in prompt_templates table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'prompt_templates' 
ORDER BY ordinal_position;

-- Show a sample record to understand the structure
SELECT * FROM prompt_templates LIMIT 1;

-- Show all Content Ideation prompts
SELECT 
  name,
  description,
  category,
  provider,
  is_active
FROM prompt_templates 
WHERE category = 'Content Ideation'
ORDER BY created_at DESC;

-- Count total prompts
SELECT 
  'Total prompts' as info,
  COUNT(*) as count
FROM prompt_templates;