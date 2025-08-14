-- ========================================
-- VERIFY APPROVAL FLOW
-- ========================================
-- Run this in Supabase SQL Editor to check content flow
-- ========================================

-- 1. Check content by status
SELECT 
    status,
    COUNT(*) as count,
    MAX(created_at) as latest_created,
    MAX(updated_at) as latest_updated
FROM generated_content
GROUP BY status
ORDER BY status;

-- 2. Show admin_approved content (should appear in User Portal)
SELECT 
    id,
    status,
    LEFT(content_text, 100) as content_preview,
    created_at,
    updated_at,
    approved_at,
    approved_by
FROM generated_content
WHERE status = 'admin_approved'
ORDER BY updated_at DESC
LIMIT 10;

-- 3. Show recent status changes
SELECT 
    id,
    status,
    revision_notes,
    created_at,
    updated_at,
    CASE 
        WHEN updated_at > created_at THEN 'Updated'
        ELSE 'Created'
    END as action
FROM generated_content
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 10;

-- 4. Verify the complete flow
SELECT 
    '=== Content Flow Summary ===' as report,
    '' as value
UNION ALL
SELECT 
    'Draft Content:' as report,
    COUNT(*)::text as value
FROM generated_content
WHERE status = 'draft'
UNION ALL
SELECT 
    'Admin Approved:' as report,
    COUNT(*)::text as value
FROM generated_content
WHERE status = 'admin_approved'
UNION ALL
SELECT 
    'Client Approved:' as report,
    COUNT(*)::text as value
FROM generated_content
WHERE status = 'client_approved'
UNION ALL
SELECT 
    'Scheduled:' as report,
    COUNT(*)::text as value
FROM generated_content
WHERE status = 'scheduled'
UNION ALL
SELECT 
    'Published:' as report,
    COUNT(*)::text as value
FROM generated_content
WHERE status = 'published';

-- 5. Check if admin_approved content is accessible (no RLS blocking)
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Admin approved content is accessible'
        ELSE '❌ No admin approved content found - check RLS policies'
    END as status_check
FROM generated_content
WHERE status = 'admin_approved';