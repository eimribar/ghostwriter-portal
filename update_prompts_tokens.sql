-- ========================================
-- UPDATE PROMPT TEMPLATES TOKEN LIMITS
-- ========================================
-- This updates all existing prompts to use Gemini's full token capacity
-- Run this in Supabase SQL Editor
-- ========================================

-- Update all prompt templates to use 1 million tokens max
UPDATE prompt_templates
SET 
    settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{max_tokens}',
        '1048576'::jsonb
    ),
    updated_at = NOW()
WHERE category IN ('Content Generation', 'Content Ideation', 'Content Editing');

-- Verify the update
SELECT 
    name,
    category,
    settings->>'max_tokens' as max_tokens,
    settings->>'temperature' as temperature,
    updated_at
FROM prompt_templates
WHERE is_active = true
ORDER BY category, name;

-- Success message
SELECT 
    '✅ Token limits updated!' as status,
    COUNT(*) as prompts_updated,
    'All prompts now support up to 1 million tokens' as message
FROM prompt_templates
WHERE settings->>'max_tokens' = '1048576';