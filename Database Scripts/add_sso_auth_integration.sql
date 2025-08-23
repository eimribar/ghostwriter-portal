-- =====================================================
-- SSO AUTHENTICATION INTEGRATION
-- Add Supabase Auth integration to clients table
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add auth integration fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS invitation_status TEXT CHECK (invitation_status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auth_provider TEXT; -- 'email', 'google', 'github', etc.

-- Remove deprecated PIN field (after migration is complete)
-- ALTER TABLE clients DROP COLUMN IF EXISTS mobile_pin;

-- Create index for auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);

-- Create index for invitation status
CREATE INDEX IF NOT EXISTS idx_clients_invitation_status ON clients(invitation_status);

-- Update RLS policies for auth-based access
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own client data" ON clients;
DROP POLICY IF EXISTS "Users can update their own client data" ON clients;

-- Create new auth-based RLS policies
CREATE POLICY "Clients can view their own data" ON clients
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Clients can update their own data" ON clients
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Admin access policy (for ghostwriter portal)
CREATE POLICY "Admins can manage all client data" ON clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'eimrib@yess.ai'
    )
    OR auth.uid() IS NULL -- Allow anonymous access for admin portal
  );

-- Update generated_content RLS for auth integration
DROP POLICY IF EXISTS "Clients can view their own content" ON generated_content;
DROP POLICY IF EXISTS "Clients can update their own content" ON generated_content;

-- New auth-based policies for generated_content
CREATE POLICY "Clients can view their content via auth" ON generated_content
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update their content via auth" ON generated_content
  FOR UPDATE USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Create invitation tracking table
CREATE TABLE IF NOT EXISTS client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_by UUID, -- Admin who sent invitation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for client_invitations
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON client_invitations(token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_email ON client_invitations(email);
CREATE INDEX IF NOT EXISTS idx_client_invitations_status ON client_invitations(status);

-- RLS for client_invitations
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read valid invitations" ON client_invitations
  FOR SELECT USING (status = 'pending' AND expires_at > NOW());

CREATE POLICY "Admins can manage invitations" ON client_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'eimrib@yess.ai'
    )
    OR auth.uid() IS NULL -- Allow anonymous access for admin portal
  );

-- Function to automatically update client status when auth user is created
CREATE OR REPLACE FUNCTION handle_client_auth_signup()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update client record when user signs up with matching email
  UPDATE clients 
  SET 
    auth_user_id = NEW.id,
    invitation_status = 'accepted',
    last_login_at = NOW(),
    auth_provider = COALESCE(NEW.app_metadata->>'provider', 'email'),
    updated_at = NOW()
  WHERE email = NEW.email AND invitation_status = 'pending';
  
  -- Update invitation status
  UPDATE client_invitations
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE email = NEW.email AND status = 'pending';
  
  RETURN NEW;
END;
$$;

-- Create trigger for auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_client_auth_signup();

-- Function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

-- Function to send client invitation (called from admin portal)
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
  v_token TEXT;
  v_invitation_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get client email
  SELECT email INTO v_client_email
  FROM clients
  WHERE id = p_client_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  -- Generate secure token
  v_token := generate_invitation_token();
  v_expires_at := NOW() + INTERVAL '7 days';
  
  -- Create invitation record
  INSERT INTO client_invitations (client_id, email, token, created_by, expires_at)
  VALUES (p_client_id, v_client_email, v_token, p_admin_id, v_expires_at)
  RETURNING id INTO v_invitation_id;
  
  -- Update client status
  UPDATE clients 
  SET 
    invitation_status = 'pending',
    invitation_sent_at = NOW(),
    updated_at = NOW()
  WHERE id = p_client_id;
  
  -- Return invitation details
  RETURN QUERY SELECT v_invitation_id, v_token, v_expires_at;
END;
$$;

-- Test data update (only run if you have existing test clients)
-- UPDATE clients SET invitation_status = 'pending' WHERE email IS NOT NULL;

COMMENT ON TABLE client_invitations IS 'Tracks invitation tokens for client SSO onboarding';
COMMENT ON FUNCTION handle_client_auth_signup() IS 'Automatically links auth users to client records on signup';
COMMENT ON FUNCTION send_client_invitation(UUID, UUID) IS 'Generates secure invitation for client SSO signup';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND column_name IN ('auth_user_id', 'invitation_status', 'invitation_sent_at', 'last_login_at', 'auth_provider')
ORDER BY column_name;