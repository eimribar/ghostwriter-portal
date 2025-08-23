-- =====================================================
-- FIX INVITATION FUNCTION
-- Handles all edge cases and provides clear errors
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop the old function first
DROP FUNCTION IF EXISTS send_client_invitation(UUID, UUID);

-- Create improved version that handles existing invitations
CREATE OR REPLACE FUNCTION send_client_invitation(
  p_client_id UUID,
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(invitation_id UUID, token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_email TEXT;
  v_client_name TEXT;
  v_token TEXT;
  v_invitation_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_existing_invitation UUID;
BEGIN
  -- Get client details
  SELECT email, name 
  INTO v_client_email, v_client_name
  FROM clients
  WHERE id = p_client_id;
  
  -- Check if client exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client with ID % not found', p_client_id;
  END IF;
  
  -- Check if client has an email
  IF v_client_email IS NULL OR v_client_email = '' THEN
    RAISE EXCEPTION 'Client % does not have an email address', v_client_name;
  END IF;
  
  -- Check for existing pending invitation
  SELECT id INTO v_existing_invitation
  FROM client_invitations
  WHERE client_id = p_client_id
    AND status = 'pending';
  
  -- If exists, delete it to create a fresh one
  IF v_existing_invitation IS NOT NULL THEN
    DELETE FROM client_invitations
    WHERE id = v_existing_invitation;
    
    RAISE NOTICE 'Deleted existing invitation % for client %', v_existing_invitation, v_client_name;
  END IF;
  
  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'base64url');
  v_expires_at := NOW() + INTERVAL '7 days';
  
  -- Create new invitation record
  INSERT INTO client_invitations (
    client_id, 
    email, 
    token, 
    created_by, 
    expires_at,
    status,
    sent_at
  )
  VALUES (
    p_client_id, 
    v_client_email, 
    v_token, 
    p_admin_id, 
    v_expires_at,
    'pending',
    NOW()
  )
  RETURNING id INTO v_invitation_id;
  
  -- Update client status
  UPDATE clients 
  SET 
    invitation_status = 'pending',
    invitation_sent_at = NOW(),
    auth_status = 'invitation_sent',
    invitation_expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = p_client_id;
  
  -- Log success
  RAISE NOTICE 'Created invitation % for client % (%)', v_invitation_id, v_client_name, v_client_email;
  
  -- Return invitation details
  RETURN QUERY SELECT v_invitation_id, v_token, v_expires_at;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION send_client_invitation(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION send_client_invitation(UUID, UUID) TO authenticated;

-- Test the function to make sure it works
DO $$
BEGIN
  RAISE NOTICE 'Invitation function created successfully!';
  RAISE NOTICE 'You can now send invitations to clients.';
END $$;