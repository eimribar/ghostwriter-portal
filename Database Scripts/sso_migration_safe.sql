-- =====================================================
-- SAFE SSO AUTHENTICATION MIGRATION
-- Checks for existing objects before creating
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Add auth integration fields to clients table (if not exists)
DO $$ 
BEGIN
  -- Add auth_user_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'auth_user_id') THEN
    ALTER TABLE clients ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add invitation_status if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'invitation_status') THEN
    ALTER TABLE clients ADD COLUMN invitation_status TEXT 
      CHECK (invitation_status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending';
  END IF;

  -- Add invitation_sent_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'invitation_sent_at') THEN
    ALTER TABLE clients ADD COLUMN invitation_sent_at TIMESTAMPTZ;
  END IF;

  -- Add last_login_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'last_login_at') THEN
    ALTER TABLE clients ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;

  -- Add auth_provider if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'auth_provider') THEN
    ALTER TABLE clients ADD COLUMN auth_provider TEXT;
  END IF;

  -- Add auth_status if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'auth_status') THEN
    ALTER TABLE clients ADD COLUMN auth_status TEXT DEFAULT 'not_invited' 
      CHECK (auth_status IN ('not_invited', 'invitation_sent', 'invitation_accepted', 'active', 'suspended'));
  END IF;

  -- Add other impersonation-related fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'last_password_reset') THEN
    ALTER TABLE clients ADD COLUMN last_password_reset TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'password_reset_token') THEN
    ALTER TABLE clients ADD COLUMN password_reset_token TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'failed_login_attempts') THEN
    ALTER TABLE clients ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'locked_until') THEN
    ALTER TABLE clients ADD COLUMN locked_until TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'invitation_expires_at') THEN
    ALTER TABLE clients ADD COLUMN invitation_expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'invitation_clicked_at') THEN
    ALTER TABLE clients ADD COLUMN invitation_clicked_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 2: Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_invitation_status ON clients(invitation_status);

-- Step 3: Drop existing RLS policies for clients table (to recreate them)
DROP POLICY IF EXISTS "Clients can view their own data" ON clients;
DROP POLICY IF EXISTS "Clients can update their own data" ON clients;
DROP POLICY IF EXISTS "Users can view their own client data" ON clients;
DROP POLICY IF EXISTS "Users can update their own client data" ON clients;
DROP POLICY IF EXISTS "Admins can manage all client data" ON clients;
DROP POLICY IF EXISTS "Enable read access for anon" ON clients;
DROP POLICY IF EXISTS "Enable all access for anon" ON clients;

-- Step 4: Create new auth-based RLS policies
CREATE POLICY "Clients can view their own data" ON clients
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Clients can update their own data" ON clients
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Allow anonymous access for admin portal (be careful with this in production)
CREATE POLICY "Admin portal anonymous access" ON clients
  FOR ALL USING (true);

-- Step 5: Create invitation tracking table if not exists
CREATE TABLE IF NOT EXISTS client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create indexes for client_invitations
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON client_invitations(token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_email ON client_invitations(email);
CREATE INDEX IF NOT EXISTS idx_client_invitations_status ON client_invitations(status);

-- Step 7: Enable RLS on client_invitations if not already enabled
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for client_invitations
DROP POLICY IF EXISTS "Anyone can read valid invitations" ON client_invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON client_invitations;

CREATE POLICY "Anyone can read valid invitations" ON client_invitations
  FOR SELECT USING (status = 'pending' AND expires_at > NOW());

CREATE POLICY "Admin portal can manage invitations" ON client_invitations
  FOR ALL USING (true);

-- Step 9: Create admin impersonation table if not exists
CREATE TABLE IF NOT EXISTS admin_impersonation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  impersonation_token TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 10: Create indexes for admin_impersonation
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_token ON admin_impersonation(impersonation_token);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_client ON admin_impersonation(client_id);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_active ON admin_impersonation(is_active, expires_at);

-- Step 11: Enable RLS on admin_impersonation
ALTER TABLE admin_impersonation ENABLE ROW LEVEL SECURITY;

-- Step 12: Create RLS policies for admin_impersonation
DROP POLICY IF EXISTS "Admins can manage impersonation" ON admin_impersonation;

CREATE POLICY "Admin portal can manage impersonation" ON admin_impersonation
  FOR ALL USING (true);

-- Step 13: Create audit log table if not exists
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  admin_email TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'invitation_sent', 'invitation_clicked', 'signup_completed', 'login_success', 
    'login_failed', 'password_reset', 'admin_impersonation_start', 
    'admin_impersonation_end', 'account_suspended', 'account_reactivated'
  )),
  event_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 14: Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_client ON auth_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_date ON auth_audit_log(created_at);

-- Step 15: Enable RLS on audit log
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 16: Create RLS policies for audit log
DROP POLICY IF EXISTS "Admins can view audit log" ON auth_audit_log;
DROP POLICY IF EXISTS "System can insert audit log" ON auth_audit_log;

CREATE POLICY "Admin portal can view audit log" ON auth_audit_log
  FOR SELECT USING (true);

CREATE POLICY "System can insert audit log" ON auth_audit_log
  FOR INSERT WITH CHECK (true);

-- Step 17: Create admin users table if not exists
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  can_impersonate BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 18: Insert admin user if not exists
INSERT INTO admin_users (email, name, role, can_impersonate)
VALUES ('eimrib@yess.ai', 'Eimri Bar', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  can_impersonate = EXCLUDED.can_impersonate,
  updated_at = NOW();

-- Step 19: Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
CREATE POLICY "Admin portal can view admin_users" ON admin_users
  FOR SELECT USING (true);

-- Step 20: Update generated_content RLS policies
DROP POLICY IF EXISTS "Clients can view their content via auth" ON generated_content;
DROP POLICY IF EXISTS "Clients can update their content via auth" ON generated_content;
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

-- Step 21: Create or replace functions
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

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
    auth_status = 'invitation_sent',
    updated_at = NOW()
  WHERE id = p_client_id;
  
  -- Return invitation details
  RETURN QUERY SELECT v_invitation_id, v_token, v_expires_at;
END;
$$;

-- Step 22: Create impersonation functions
CREATE OR REPLACE FUNCTION create_impersonation_token(
  p_admin_email TEXT,
  p_client_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Only allow specific admin emails
  IF p_admin_email NOT IN (SELECT email FROM admin_users WHERE can_impersonate = true) THEN
    RAISE EXCEPTION 'Unauthorized admin email';
  END IF;
  
  -- Verify client exists
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'base64url');
  v_expires_at := NOW() + INTERVAL '1 hour';
  
  -- End any existing active impersonation sessions for this client
  UPDATE admin_impersonation 
  SET 
    is_active = false,
    ended_at = NOW(),
    updated_at = NOW()
  WHERE client_id = p_client_id AND is_active = true;
  
  -- Create new impersonation record
  INSERT INTO admin_impersonation (
    admin_email,
    client_id,
    impersonation_token,
    expires_at,
    reason,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_email,
    p_client_id,
    v_token,
    v_expires_at,
    p_reason,
    p_ip_address,
    p_user_agent
  );
  
  -- Log the impersonation start
  INSERT INTO auth_audit_log (
    client_id,
    admin_email,
    event_type,
    event_details,
    ip_address,
    user_agent
  ) VALUES (
    p_client_id,
    p_admin_email,
    'admin_impersonation_start',
    jsonb_build_object(
      'reason', p_reason,
      'token_expires', v_expires_at
    ),
    p_ip_address,
    p_user_agent
  );
  
  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION validate_impersonation_token(p_token TEXT)
RETURNS TABLE(
  client_id UUID,
  client_email TEXT,
  client_name TEXT,
  admin_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_impersonation RECORD;
BEGIN
  -- Get impersonation record
  SELECT ai.*, c.email as client_email, c.name as client_name
  INTO v_impersonation
  FROM admin_impersonation ai
  JOIN clients c ON c.id = ai.client_id
  WHERE ai.impersonation_token = p_token
    AND ai.is_active = true
    AND ai.expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired impersonation token';
  END IF;
  
  -- Return client info
  RETURN QUERY SELECT 
    v_impersonation.client_id,
    v_impersonation.client_email,
    v_impersonation.client_name,
    v_impersonation.admin_email;
END;
$$;

CREATE OR REPLACE FUNCTION end_impersonation_session(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_impersonation RECORD;
BEGIN
  -- Get and update impersonation record
  UPDATE admin_impersonation
  SET 
    is_active = false,
    ended_at = NOW(),
    updated_at = NOW()
  WHERE impersonation_token = p_token
    AND is_active = true
  RETURNING * INTO v_impersonation;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Log the impersonation end
  INSERT INTO auth_audit_log (
    client_id,
    admin_email,
    event_type,
    event_details
  ) VALUES (
    v_impersonation.client_id,
    v_impersonation.admin_email,
    'admin_impersonation_end',
    jsonb_build_object(
      'duration_minutes', EXTRACT(EPOCH FROM (NOW() - v_impersonation.started_at)) / 60
    )
  );
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_expired_impersonation_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE admin_impersonation
  SET 
    is_active = false,
    ended_at = COALESCE(ended_at, NOW()),
    updated_at = NOW()
  WHERE is_active = true 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Step 23: Create trigger for auth signup
CREATE OR REPLACE FUNCTION handle_client_auth_signup()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Link new auth user to existing client record by email
  UPDATE clients 
  SET 
    auth_user_id = NEW.id,
    invitation_status = 'accepted',
    auth_status = 'active',
    last_login_at = NOW(),
    auth_provider = COALESCE(NEW.app_metadata->>'provider', 'email'),
    updated_at = NOW()
  WHERE email = NEW.email 
    AND auth_user_id IS NULL
  RETURNING id INTO v_client_id;
  
  -- Update invitation status
  IF v_client_id IS NOT NULL THEN
    UPDATE client_invitations
    SET 
      status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
    WHERE email = NEW.email AND status = 'pending';
    
    -- Log the signup completion
    INSERT INTO auth_audit_log (
      client_id,
      admin_email,
      event_type,
      event_details
    ) VALUES (
      v_client_id,
      NULL,
      'signup_completed',
      jsonb_build_object(
        'provider', COALESCE(NEW.app_metadata->>'provider', 'email'),
        'user_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_client_auth_signup();

-- Step 24: Update existing client statuses
UPDATE clients 
SET auth_status = CASE 
  WHEN auth_user_id IS NOT NULL THEN 'active'
  WHEN invitation_status = 'accepted' THEN 'active'
  WHEN invitation_status = 'pending' THEN 'invitation_sent'
  ELSE 'not_invited'
END
WHERE auth_status IS NULL OR auth_status = 'not_invited';

-- Step 25: Verify installation
DO $$
BEGIN
  RAISE NOTICE '✅ SSO Authentication System Installation Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '  - clients (with auth fields)';
  RAISE NOTICE '  - client_invitations';
  RAISE NOTICE '  - admin_impersonation';
  RAISE NOTICE '  - auth_audit_log';
  RAISE NOTICE '  - admin_users';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin user configured: eimrib@yess.ai';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Configure environment variables in Vercel';
  RAISE NOTICE '  2. Enable OAuth providers in Supabase';
  RAISE NOTICE '  3. Test the invitation flow';
END $$;