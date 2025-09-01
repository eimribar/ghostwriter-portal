-- =====================================================
-- FIX IMPERSONATION FUNCTIONS
-- Drops existing functions and recreates them
-- =====================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS create_impersonation_token(text,uuid,text,text,text);
DROP FUNCTION IF EXISTS validate_impersonation_token(text);
DROP FUNCTION IF EXISTS end_impersonation_session(text);
DROP FUNCTION IF EXISTS get_client_auth_overview();

-- Drop table if you want to start fresh (optional - comment out if you want to keep existing sessions)
-- DROP TABLE IF EXISTS admin_impersonation_sessions;

-- 1. Create the impersonation sessions table
CREATE TABLE IF NOT EXISTS admin_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  admin_email TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '4 hours',
  ended_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_impersonation_token ON admin_impersonation_sessions(token);
CREATE INDEX IF NOT EXISTS idx_impersonation_expires ON admin_impersonation_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_impersonation_client ON admin_impersonation_sessions(client_id);

-- 3. Create RPC function to create impersonation token
CREATE OR REPLACE FUNCTION create_impersonation_token(
  p_admin_email TEXT,
  p_client_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(token TEXT, client_id UUID, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate a unique token
  v_token := gen_random_uuid()::text;
  v_expires_at := NOW() + INTERVAL '4 hours';
  
  -- Insert the session
  INSERT INTO admin_impersonation_sessions (
    token,
    admin_email,
    client_id,
    reason,
    ip_address,
    user_agent,
    expires_at
  ) VALUES (
    v_token,
    p_admin_email,
    p_client_id,
    p_reason,
    p_ip_address,
    p_user_agent,
    v_expires_at
  );
  
  -- Return the token details
  RETURN QUERY
  SELECT v_token AS token, p_client_id AS client_id, v_expires_at AS expires_at;
END;
$$;

-- 4. Create RPC function to validate impersonation token
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
BEGIN
  -- Clean up expired sessions first
  DELETE FROM admin_impersonation_sessions
  WHERE expires_at < NOW() OR ended_at IS NOT NULL;
  
  -- Return client details if token is valid
  RETURN QUERY
  SELECT 
    s.client_id,
    c.email AS client_email,
    c.name AS client_name,
    s.admin_email
  FROM admin_impersonation_sessions s
  JOIN clients c ON c.id = s.client_id
  WHERE s.token = p_token
    AND s.expires_at > NOW()
    AND s.ended_at IS NULL
  LIMIT 1;
END;
$$;

-- 5. Create RPC function to end impersonation session
CREATE OR REPLACE FUNCTION end_impersonation_session(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_impersonation_sessions
  SET ended_at = NOW()
  WHERE token = p_token
    AND ended_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- 6. Create RPC function to get client auth overview (for the removed Client Auth page)
CREATE OR REPLACE FUNCTION get_client_auth_overview()
RETURNS TABLE(
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  client_company TEXT,
  auth_status TEXT,
  auth_provider TEXT,
  last_login_at TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INT,
  is_locked BOOLEAN,
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  invitation_expires_at TIMESTAMP WITH TIME ZONE,
  has_active_impersonation BOOLEAN
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
    c.company AS client_company,
    COALESCE(c.auth_status, 'not_invited')::TEXT AS auth_status,
    c.auth_provider::TEXT,
    c.last_login_at,
    COALESCE(c.failed_login_attempts, 0)::INT AS failed_login_attempts,
    COALESCE(c.is_locked, false) AS is_locked,
    ci.created_at AS invitation_sent_at,
    ci.expires_at AS invitation_expires_at,
    EXISTS(
      SELECT 1 FROM admin_impersonation_sessions s 
      WHERE s.client_id = c.id 
        AND s.expires_at > NOW() 
        AND s.ended_at IS NULL
    ) AS has_active_impersonation
  FROM clients c
  LEFT JOIN client_invitations ci ON ci.client_id = c.id AND ci.status = 'pending'
  ORDER BY c.created_at DESC;
END;
$$;

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON admin_impersonation_sessions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_impersonation_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_impersonation_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION end_impersonation_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_client_auth_overview TO anon, authenticated;

-- 8. Create RLS policies for the sessions table
ALTER TABLE admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can manage impersonation sessions" ON admin_impersonation_sessions;

-- Allow admins to create and manage impersonation sessions
CREATE POLICY "Admins can manage impersonation sessions" ON admin_impersonation_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Impersonation system fixed and ready!';
END $$;