-- =====================================================
-- CREATE TEST AUTH USER
-- Creates a test user that can sign into the new SSO system
-- Run AFTER the main migration
-- =====================================================

-- First, let's see what clients we have
SELECT id, name, email, invitation_status FROM clients;

-- Update Jonathan's client to be ready for SSO (if it exists)
UPDATE clients 
SET 
  invitation_status = 'accepted',
  updated_at = NOW()
WHERE email = 'jonathan@company.com';

-- If Jonathan doesn't exist, create him
INSERT INTO clients (
  id, 
  name, 
  email, 
  company, 
  status, 
  portal_access, 
  invitation_status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'Jonathan Bregman',
  'jonathan@company.com',
  'Test Company',
  'active',
  true,
  'accepted',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM clients WHERE email = 'jonathan@company.com'
);

-- Check the result
SELECT 
  id, 
  name, 
  email, 
  company, 
  invitation_status,
  portal_access
FROM clients 
WHERE email = 'jonathan@company.com';