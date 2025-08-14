-- ========================================
-- VERIFY PROMPTS ARE LOADED
-- ========================================
-- Run this in Supabase SQL Editor to check if prompts are properly loaded
-- ========================================

-- Check if prompt_templates table exists and has data
SELECT 
    'Prompt Templates Table' as check_item,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Table has ' || COUNT(*) || ' prompts'
        ELSE '❌ Table is empty'
    END as status
FROM prompt_templates
WHERE is_active = true

UNION ALL

-- Check Content Generation prompts specifically
SELECT 
    'Content Generation Prompts' as check_item,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ All 4 LinkedIn prompts loaded'
        WHEN COUNT(*) > 0 THEN '⚠️ Only ' || COUNT(*) || ' prompts loaded (expected 4)'
        ELSE '❌ No Content Generation prompts found'
    END as status
FROM prompt_templates
WHERE category = 'Content Generation'
AND is_active = true

UNION ALL

-- Check if prompts have full content
SELECT 
    'Prompt Content Length' as check_item,
    CASE 
        WHEN MIN(LENGTH(system_message)) > 1000 THEN '✅ All prompts have full content'
        ELSE '❌ Some prompts have truncated content'
    END as status
FROM prompt_templates
WHERE category = 'Content Generation'

UNION ALL

-- List all prompts with their details
SELECT 
    'Prompt: ' || name as check_item,
    '📝 ' || LENGTH(system_message) || ' chars, ' || 
    COALESCE(array_length(tags, 1), 0) || ' tags' as status
FROM prompt_templates
WHERE category = 'Content Generation'
ORDER BY name;

-- Show summary
SELECT 
    '=' as "=",
    'SUMMARY' as "=",
    '=' as "="
FROM generate_series(1,1);

SELECT 
    COUNT(*) as total_prompts,
    COUNT(CASE WHEN category = 'Content Generation' THEN 1 END) as generation_prompts,
    COUNT(CASE WHEN category = 'Content Ideation' THEN 1 END) as ideation_prompts,
    COUNT(CASE WHEN category = 'Content Editing' THEN 1 END) as editing_prompts,
    ROUND(AVG(LENGTH(system_message))) as avg_prompt_length
FROM prompt_templates
WHERE is_active = true;