-- =====================================================
-- COMPLETE CLIENT INVITATION SYSTEM SETUP
-- Run this in Supabase SQL Editor to fix authentication
-- =====================================================

-- Step 1: Add missing fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'not_invited' CHECK (invitation_status IN ('not_invited', 'pending', 'accepted', 'expired')),
ADD COLUMN IF NOT EXISTS auth_status TEXT DEFAULT 'not_invited' CHECK (auth_status IN ('not_invited', 'invited', 'signed_up', 'active')),
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Step 2: Create client_invitations table
CREATE TABLE IF NOT EXISTS client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_by TEXT,
  admin_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_invitation_token ON clients(invitation_token);
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email_lower ON clients(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON client_invitations(token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_client_id ON client_invitations(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_email_lower ON client_invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_client_invitations_status ON client_invitations(status);
CREATE INDEX IF NOT EXISTS idx_client_invitations_expires_at ON client_invitations(expires_at);

-- Step 4: Enable RLS on client_invitations
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for client_invitations
DROP POLICY IF EXISTS "Allow all for anon" ON client_invitations;
CREATE POLICY "Allow all for anon" ON client_invitations
FOR ALL TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON client_invitations;
CREATE POLICY "Allow all for authenticated" ON client_invitations
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Step 6: Create function to send client invitation
CREATE OR REPLACE FUNCTION send_client_invitation(
  p_client_id UUID,
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
  invitation_id UUID,
  token TEXT,
  client_email TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_email TEXT;
  v_client_name TEXT;
  v_invitation_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get client details
  SELECT email, name INTO v_client_email, v_client_name
  FROM clients
  WHERE id = p_client_id;
  
  IF v_client_email IS NULL THEN
    RAISE EXCEPTION 'Client not found with ID: %', p_client_id;
  END IF;
  
  -- Generate unique token
  v_token := gen_random_uuid()::text;
  v_expires_at := NOW() + INTERVAL '7 days';
  v_invitation_id := gen_random_uuid();
  
  -- Cancel any existing pending invitations for this client
  UPDATE client_invitations
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE client_id = p_client_id
    AND status = 'pending';
  
  -- Create new invitation
  INSERT INTO client_invitations (
    id,
    client_id,
    email,
    token,
    status,
    expires_at,
    created_by
  ) VALUES (
    v_invitation_id,
    p_client_id,
    v_client_email,
    v_token,
    'pending',
    v_expires_at,
    COALESCE(p_admin_id::text, 'system')
  );
  
  -- Update client table with invitation info
  UPDATE clients
  SET 
    invitation_token = v_token,
    invitation_status = 'pending',
    auth_status = 'invited',
    updated_at = NOW()
  WHERE id = p_client_id;
  
  -- Return invitation details
  RETURN QUERY
  SELECT v_invitation_id, v_token, v_client_email, v_expires_at;
END;
$$;

-- Step 7: Create function to validate invitation token
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token TEXT)
RETURNS TABLE(
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  invitation_id UUID,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up expired invitations first
  UPDATE client_invitations
  SET status = 'expired',
      updated_at = NOW()
  WHERE expires_at < NOW()
    AND status = 'pending';
  
  -- Return invitation details if valid
  RETURN QUERY
  SELECT 
    c.id AS client_id,
    c.name AS client_name,
    c.email AS client_email,
    i.id AS invitation_id,
    (i.status = 'pending' AND i.expires_at > NOW()) AS is_valid
  FROM client_invitations i
  JOIN clients c ON c.id = i.client_id
  WHERE i.token = p_token
  LIMIT 1;
END;
$$;

-- Step 8: Create function to accept invitation and link user
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token TEXT,
  p_auth_user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  client_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_invitation_id UUID;
  v_client_email TEXT;
BEGIN
  -- Validate invitation
  SELECT i.client_id, i.id, c.email INTO v_client_id, v_invitation_id, v_client_email
  FROM client_invitations i
  JOIN clients c ON c.id = i.client_id
  WHERE i.token = p_token
    AND i.status = 'pending'
    AND i.expires_at > NOW()
  LIMIT 1;
  
  IF v_client_id IS NULL THEN
    RETURN QUERY
    SELECT FALSE, NULL::UUID, 'Invalid or expired invitation token'::TEXT;
    RETURN;
  END IF;
  
  -- Update invitation status
  UPDATE client_invitations
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_invitation_id;
  
  -- Link client to auth user
  UPDATE clients
  SET 
    auth_user_id = p_auth_user_id,
    invitation_status = 'accepted',
    auth_status = 'signed_up',
    last_login_at = NOW(),
    updated_at = NOW()
  WHERE id = v_client_id;
  
  RETURN QUERY
  SELECT TRUE, v_client_id, 'Invitation accepted successfully'::TEXT;
END;
$$;

-- Step 9: Create function for case-insensitive client lookup
CREATE OR REPLACE FUNCTION find_client_by_email(p_email TEXT)
RETURNS TABLE(
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  auth_user_id UUID,
  portal_access BOOLEAN,
  auth_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS client_id,
    c.name AS client_name,
    c.email AS client_email,
    c.auth_user_id,
    c.portal_access,
    COALESCE(c.auth_status, 'not_invited') AS auth_status
  FROM clients c
  WHERE LOWER(c.email) = LOWER(p_email)
  LIMIT 1;
END;
$$;

-- Step 10: Create function to manually fix client auth issues
CREATE OR REPLACE FUNCTION fix_client_auth(
  p_client_email TEXT,
  p_auth_user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  client_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Find client by email (case-insensitive)
  SELECT id INTO v_client_id
  FROM clients
  WHERE LOWER(email) = LOWER(p_client_email)
  LIMIT 1;
  
  IF v_client_id IS NULL THEN
    RETURN QUERY
    SELECT FALSE, 'Client not found with email: ' || p_client_email, NULL::UUID;
    RETURN;
  END IF;
  
  -- Update client with auth user ID
  UPDATE clients
  SET 
    auth_user_id = p_auth_user_id,
    auth_status = 'active',
    last_login_at = NOW(),
    updated_at = NOW()
  WHERE id = v_client_id;
  
  RETURN QUERY
  SELECT TRUE, 'Client auth fixed successfully', v_client_id;
END;
$$;

-- Step 11: Grant permissions to functions
GRANT EXECUTE ON FUNCTION send_client_invitation TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_invitation_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_client_by_email TO anon, authenticated;
GRANT EXECUTE ON FUNCTION fix_client_auth TO anon, authenticated;

-- Step 12: Create cleanup function for expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE client_invitations
  SET status = 'expired',
      updated_at = NOW()
  WHERE expires_at < NOW()
    AND status = 'pending';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_expired_invitations TO anon, authenticated;

-- Step 13: Success message and verification
DO $$
DECLARE
  clients_count INTEGER;
  invitations_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO clients_count FROM clients;
  SELECT COUNT(*) INTO invitations_count FROM client_invitations;
  
  RAISE NOTICE '✅ Client invitation system setup completed successfully!';
  RAISE NOTICE '📊 Current clients: %', clients_count;
  RAISE NOTICE '📧 Current invitations: %', invitations_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Available functions:';
  RAISE NOTICE '   - send_client_invitation(client_id, admin_id)';
  RAISE NOTICE '   - validate_invitation_token(token)';
  RAISE NOTICE '   - accept_invitation(token, auth_user_id)';
  RAISE NOTICE '   - find_client_by_email(email) -- case-insensitive';
  RAISE NOTICE '   - fix_client_auth(email, auth_user_id) -- manual fix';
  RAISE NOTICE '   - cleanup_expired_invitations()';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 System is ready for client invitations!';
END $$;