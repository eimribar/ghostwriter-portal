-- ========================================
-- CHECK PROMPT UPDATES
-- ========================================
-- Run this to verify if prompts are actually being updated
-- ========================================

-- 1. Show all prompts with their update times
SELECT 
    id,
    name,
    category,
    LEFT(system_message, 100) as message_preview,
    created_at,
    updated_at,
    CASE 
        WHEN updated_at > created_at THEN '✅ Updated'
        ELSE '❌ Never updated'
    END as update_status
FROM prompt_templates
WHERE is_active = true
ORDER BY updated_at DESC;

-- 2. Show recently updated prompts (last hour)
SELECT 
    id,
    name,
    updated_at,
    updated_at - created_at as time_since_creation,
    LEFT(system_message, 50) as message_start
FROM prompt_templates
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- 3. Test update directly (replace with actual ID and content)
-- Uncomment and modify to test:
/*
UPDATE prompt_templates
SET 
    system_message = 'TEST UPDATE: ' || system_message,
    updated_at = NOW()
WHERE id = 'YOUR-PROMPT-ID-HERE'
RETURNING id, name, updated_at;
*/

-- 4. Check if there are any RLS policies blocking updates
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'prompt_templates';