-- =====================================================
-- MANUAL FIX FOR JONATHAN BREGMAN AUTHENTICATION
-- Run this after the main setup script to fix existing client
-- =====================================================

-- First, let's see the current state
SELECT 
  'Current Jonathan client record:' as info,
  id,
  name,
  email,
  auth_user_id,
  invitation_status,
  auth_status,
  portal_access,
  invitation_token,
  created_at
FROM clients 
WHERE LOWER(email) = LOWER('Jonathan@yess.ai')
OR LOWER(email) = LOWER('jonathan@yess.ai');

-- Check for any existing invitations
SELECT 
  'Current invitations for Jonathan:' as info,
  ci.id,
  ci.token,
  ci.status,
  ci.expires_at,
  ci.created_at,
  c.name as client_name,
  c.email as client_email
FROM client_invitations ci
JOIN clients c ON c.id = ci.client_id
WHERE LOWER(c.email) LIKE '%jonathan%yess.ai%'
OR LOWER(ci.email) LIKE '%jonathan%yess.ai%';

-- Now let's fix Jonathan's record step by step

-- Step 1: Update Jonathan's client record to ensure it has proper fields
UPDATE clients 
SET 
  portal_access = TRUE,
  invitation_status = 'pending',
  auth_status = 'invited',
  updated_at = NOW()
WHERE LOWER(email) = LOWER('Jonathan@yess.ai')
AND portal_access IS DISTINCT FROM TRUE;

-- Step 2: Create a fresh invitation for Jonathan
-- First, get Jonathan's client ID
DO $$
DECLARE
  jonathan_client_id UUID;
  invitation_result RECORD;
BEGIN
  -- Get Jonathan's ID
  SELECT id INTO jonathan_client_id
  FROM clients
  WHERE LOWER(email) = LOWER('Jonathan@yess.ai')
  LIMIT 1;
  
  IF jonathan_client_id IS NOT NULL THEN
    RAISE NOTICE 'Found Jonathan client ID: %', jonathan_client_id;
    
    -- Cancel any existing invitations
    UPDATE client_invitations
    SET status = 'cancelled', updated_at = NOW()
    WHERE client_id = jonathan_client_id
    AND status = 'pending';
    
    -- Create new invitation using our function
    SELECT * FROM send_client_invitation(jonathan_client_id)
    INTO invitation_result;
    
    RAISE NOTICE '✅ New invitation created for Jonathan:';
    RAISE NOTICE '   Token: %', invitation_result.token;
    RAISE NOTICE '   Expires: %', invitation_result.expires_at;
    RAISE NOTICE '   Email: %', invitation_result.client_email;
    
    -- Generate the invitation URL
    RAISE NOTICE '🔗 Invitation URL: https://www.agentss.app/auth?invitation=%', invitation_result.token;
    
  ELSE
    RAISE NOTICE '❌ Jonathan client not found with email Jonathan@yess.ai';
    
    -- Check what emails we do have
    FOR invitation_result IN 
      SELECT email FROM clients WHERE email ILIKE '%jonathan%' OR email ILIKE '%yess.ai%'
    LOOP
      RAISE NOTICE '   Found similar email: %', invitation_result.email;
    END LOOP;
  END IF;
END $$;

-- Step 3: Show final state
SELECT 
  '✅ FINAL STATE - Jonathan client record:' as info,
  c.id,
  c.name,
  c.email,
  c.auth_user_id,
  c.invitation_status,
  c.auth_status,
  c.portal_access,
  c.invitation_token,
  ci.token as new_invitation_token,
  ci.expires_at as invitation_expires
FROM clients c
LEFT JOIN client_invitations ci ON ci.client_id = c.id AND ci.status = 'pending'
WHERE LOWER(c.email) = LOWER('Jonathan@yess.ai');

-- Step 4: Provide troubleshooting info
SELECT 
  '🔧 TROUBLESHOOTING INFO:' as section,
  'If Jonathan still can''t log in, check:' as info;

SELECT 
  '1. Email case matching:' as check,
  'Jonathan uses: ' || email as current_email,
  'Should match exactly with Google sign-in email' as note
FROM clients 
WHERE LOWER(email) = LOWER('Jonathan@yess.ai');

SELECT 
  '2. Invitation URL format:' as check,
  'https://www.agentss.app/auth?invitation=' || token as invitation_url
FROM client_invitations ci
JOIN clients c ON c.id = ci.client_id
WHERE LOWER(c.email) = LOWER('Jonathan@yess.ai')
AND ci.status = 'pending'
ORDER BY ci.created_at DESC
LIMIT 1;

-- Step 5: Alternative manual linking if user already exists in auth.users
-- This query will help link Jonathan manually if he already has a Supabase auth user
SELECT 
  '3. Manual auth linking (if needed):' as check,
  'Use this query if Jonathan already signed up:' as instruction,
  'SELECT fix_client_auth(''Jonathan@yess.ai'', ''AUTH_USER_ID_HERE'');' as query_template;

-- Show all emails in clients table for debugging
SELECT 
  '📧 ALL CLIENT EMAILS (for debugging):' as section,
  email,
  name,
  portal_access,
  invitation_status,
  auth_status
FROM clients
ORDER BY created_at DESC;