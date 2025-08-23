-- =====================================================
-- ADMIN IMPERSONATION & CONTROL SYSTEM
-- Complete admin visibility and client management
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create admin impersonation tracking table
CREATE TABLE IF NOT EXISTS admin_impersonation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL, -- Admin who is impersonating
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_token ON admin_impersonation(impersonation_token);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_client ON admin_impersonation(client_id);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_active ON admin_impersonation(is_active, expires_at);

-- Enable RLS on admin_impersonation
ALTER TABLE admin_impersonation ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_impersonation
CREATE POLICY "Admins can manage impersonation" ON admin_impersonation
  FOR ALL USING (
    admin_email = 'eimrib@yess.ai' OR 
    auth.uid() IS NULL -- Allow anonymous access for admin portal
  );

-- Enhance clients table for better auth tracking
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS auth_status TEXT DEFAULT 'not_invited' CHECK (auth_status IN ('not_invited', 'invitation_sent', 'invitation_accepted', 'active', 'suspended')),
ADD COLUMN IF NOT EXISTS last_password_reset TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invitation_clicked_at TIMESTAMPTZ;

-- Update existing clients to have proper auth status
UPDATE clients 
SET auth_status = CASE 
  WHEN auth_user_id IS NOT NULL THEN 'active'
  WHEN invitation_status = 'accepted' THEN 'active'
  WHEN invitation_status = 'pending' THEN 'invitation_sent'
  ELSE 'not_invited'
END
WHERE auth_status = 'not_invited';

-- Create audit log table for all auth-related activities
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

-- Index for audit log
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_client ON auth_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_date ON auth_audit_log(created_at);

-- Enable RLS on audit log
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS for audit log
CREATE POLICY "Admins can view audit log" ON auth_audit_log
  FOR SELECT USING (
    admin_email = 'eimrib@yess.ai' OR 
    auth.uid() IS NULL -- Allow anonymous access for admin portal
  );

CREATE POLICY "System can insert audit log" ON auth_audit_log
  FOR INSERT WITH CHECK (true);

-- Function to create impersonation token
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
  IF p_admin_email NOT IN ('eimrib@yess.ai') THEN
    RAISE EXCEPTION 'Unauthorized admin email';
  END IF;
  
  -- Verify client exists and is active
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id AND auth_status IN ('active', 'invitation_accepted')) THEN
    RAISE EXCEPTION 'Client not found or not active';
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

-- Function to validate impersonation token
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

-- Function to end impersonation session
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

-- Function to log auth events
CREATE OR REPLACE FUNCTION log_auth_event(
  p_client_id UUID DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL,
  p_event_type TEXT,
  p_event_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
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
    p_event_type,
    p_event_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to get client auth status overview
CREATE OR REPLACE FUNCTION get_client_auth_overview()
RETURNS TABLE(
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  client_company TEXT,
  auth_status TEXT,
  auth_provider TEXT,
  last_login_at TIMESTAMPTZ,
  failed_login_attempts INTEGER,
  is_locked BOOLEAN,
  invitation_sent_at TIMESTAMPTZ,
  invitation_expires_at TIMESTAMPTZ,
  has_active_impersonation BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.id,
    c.name,
    c.email,
    c.company,
    c.auth_status,
    c.auth_provider,
    c.last_login_at,
    c.failed_login_attempts,
    (c.locked_until IS NOT NULL AND c.locked_until > NOW()) as is_locked,
    c.invitation_sent_at,
    c.invitation_expires_at,
    EXISTS(
      SELECT 1 FROM admin_impersonation ai 
      WHERE ai.client_id = c.id 
        AND ai.is_active = true 
        AND ai.expires_at > NOW()
    ) as has_active_impersonation
  FROM clients c
  WHERE c.portal_access = true
  ORDER BY c.created_at DESC;
$$;

-- Update the existing auth signup trigger to log events
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
  
  -- Log the signup completion
  IF v_client_id IS NOT NULL THEN
    PERFORM log_auth_event(
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

-- Clean up old expired impersonation sessions (run periodically)
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

-- Create some example admin accounts (update with your actual admin emails)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  can_impersonate BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert your admin user
INSERT INTO admin_users (email, name, role, can_impersonate)
VALUES ('eimrib@yess.ai', 'Eimri Bar', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  can_impersonate = EXCLUDED.can_impersonate,
  updated_at = NOW();

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin_users" ON admin_users
  FOR SELECT USING (
    email = 'eimrib@yess.ai' OR 
    auth.uid() IS NULL -- Allow anonymous access for admin portal
  );

-- Verify the migration
SELECT 'Admin impersonation system created successfully' as status;