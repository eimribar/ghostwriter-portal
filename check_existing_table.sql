-- ========================================
-- CHECK EXISTING PROMPT_TEMPLATES TABLE
-- ========================================
-- Run this to see what columns currently exist
-- ========================================

-- Check if the table exists and what columns it has
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'prompt_templates'
ORDER BY ordinal_position;

-- If no results, the table doesn't exist
-- If results show, we can see which columns are missing