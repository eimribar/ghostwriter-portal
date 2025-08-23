-- =====================================================
-- CLEAN UP ALL MOCK DATA AND TEST USERS
-- This script removes all test data and prepares for production use
-- =====================================================

-- Step 1: Remove all test/mock clients
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete known test clients
    DELETE FROM clients WHERE email IN (
        'amnon@techventures.com',
        'amnon@bounce.ai',
        'maya@growthmarketing.co',
        'sarah@techflow.io',
        'marcus@datapro.com',
        'jonathan@company.com',
        'jonathan.bregman@company.com',
        'test@example.com'
    ) OR name IN (
        'Amnon Cohen',
        'Maya Levine',
        'Sarah Chen',
        'Marcus Johnson',
        'Jonathan',
        'Jonathan Bregman',
        'Test User'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % test clients', deleted_count;
END $$;

-- Step 2: Clean up orphaned data from deleted clients
DO $$
DECLARE
    deleted_content INTEGER;
    deleted_ideas INTEGER;
    deleted_posts INTEGER;
    deleted_overrides INTEGER;
    deleted_sessions INTEGER;
BEGIN
    -- Clean generated content
    DELETE FROM generated_content WHERE client_id NOT IN (SELECT id FROM clients);
    GET DIAGNOSTICS deleted_content = ROW_COUNT;
    
    -- Clean content ideas
    DELETE FROM content_ideas WHERE client_id NOT IN (SELECT id FROM clients);
    GET DIAGNOSTICS deleted_ideas = ROW_COUNT;
    
    -- Clean scheduled posts
    DELETE FROM scheduled_posts WHERE client_id NOT IN (SELECT id FROM clients);
    GET DIAGNOSTICS deleted_posts = ROW_COUNT;
    
    -- Clean prompt overrides
    DELETE FROM user_prompt_overrides WHERE client_id NOT IN (SELECT id FROM clients);
    GET DIAGNOSTICS deleted_overrides = ROW_COUNT;
    
    -- Clean admin sessions
    UPDATE admin_sessions SET active_client_id = NULL 
    WHERE active_client_id NOT IN (SELECT id FROM clients);
    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up orphaned data:';
    RAISE NOTICE '  - Generated content: %', deleted_content;
    RAISE NOTICE '  - Content ideas: %', deleted_ideas;
    RAISE NOTICE '  - Scheduled posts: %', deleted_posts;
    RAISE NOTICE '  - Prompt overrides: %', deleted_overrides;
    RAISE NOTICE '  - Admin sessions: %', deleted_sessions;
END $$;

-- Step 3: Remove test users from auth.users (be careful with this!)
DO $$
DECLARE
    deleted_users INTEGER;
BEGIN
    -- Only delete specific test users, not all users
    DELETE FROM auth.users WHERE email IN (
        'jonathan@company.com',
        'test@example.com',
        'demo@example.com'
    ) AND email NOT IN (
        SELECT email FROM clients WHERE portal_access = true
    );
    
    GET DIAGNOSTICS deleted_users = ROW_COUNT;
    RAISE NOTICE 'Deleted % test users from auth.users', deleted_users;
END $$;

-- Step 4: Clean up test prompt templates
DO $$
DECLARE
    deleted_prompts INTEGER;
BEGIN
    -- Remove CEO-specific test prompts
    DELETE FROM prompt_templates 
    WHERE name IN (
        'CEO Leadership Insights',
        'Tech Industry Commentary'
    ) AND NOT EXISTS (
        SELECT 1 FROM user_prompt_overrides 
        WHERE base_prompt_id = prompt_templates.id
    );
    
    GET DIAGNOSTICS deleted_prompts = ROW_COUNT;
    RAISE NOTICE 'Deleted % test prompt templates', deleted_prompts;
END $$;

-- Step 5: Clean up any mock creators (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'creators') THEN
        DELETE FROM creators WHERE name IN (
            'Alex Morgan',
            'Sara Chen',
            'Marcus Johnson',
            'Test Creator'
        );
        RAISE NOTICE 'Cleaned up mock creators';
    END IF;
END $$;

-- Step 6: Reset sequences and cleanup
DO $$
BEGIN
    -- Clear any test data from search_jobs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'search_jobs') THEN
        DELETE FROM search_jobs WHERE search_query LIKE '%test%' OR search_query LIKE '%demo%';
        RAISE NOTICE 'Cleaned up test search jobs';
    END IF;
    
    -- Clear test slack data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slack_workspaces') THEN
        DELETE FROM slack_workspaces WHERE team_name LIKE '%test%' OR team_name LIKE '%demo%';
        RAISE NOTICE 'Cleaned up test Slack workspaces';
    END IF;
END $$;

-- Step 7: Verify cleanup
DO $$
DECLARE
    remaining_clients INTEGER;
    remaining_content INTEGER;
    remaining_ideas INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_clients FROM clients;
    SELECT COUNT(*) INTO remaining_content FROM generated_content;
    SELECT COUNT(*) INTO remaining_ideas FROM content_ideas;
    
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Cleanup Complete! Current Status:';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Remaining clients: %', remaining_clients;
    RAISE NOTICE 'Remaining content: %', remaining_content;
    RAISE NOTICE 'Remaining ideas: %', remaining_ideas;
    
    IF remaining_clients = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ Database is now clean and ready for production use!';
        RAISE NOTICE '🚀 You can now start onboarding real clients.';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ There are still % clients in the database.', remaining_clients;
        RAISE NOTICE 'Run this query to see them:';
        RAISE NOTICE 'SELECT id, name, email, company FROM clients;';
    END IF;
END $$;

-- Final summary
SELECT 
    'Cleanup Summary' as status,
    COUNT(*) as total_clients,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
    COUNT(CASE WHEN portal_access = true THEN 1 END) as portal_enabled_clients
FROM clients;