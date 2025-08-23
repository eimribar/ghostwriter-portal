-- =====================================================
-- URGENT: SSO MIGRATION - RUN THIS FIRST
-- This adds the required fields for SSO authentication
-- Run this in Supabase SQL Editor IMMEDIATELY
-- =====================================================

-- Add SSO fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS invitation_status TEXT CHECK (invitation_status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auth_provider TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_invitation_status ON clients(invitation_status);

-- Update existing test clients to have invitation status 'accepted'
-- This allows them to work with the new SSO system
UPDATE clients 
SET invitation_status = 'accepted'
WHERE email IS NOT NULL;

-- Create basic RLS policies for clients table
DROP POLICY IF EXISTS "Clients can view their own data" ON clients;
DROP POLICY IF EXISTS "Clients can update their own data" ON clients;
DROP POLICY IF EXISTS "Admins can manage all client data" ON clients;

-- Enable RLS on clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for admin portal (existing behavior)
CREATE POLICY "Anonymous access for admin portal" ON clients
  FOR ALL USING (auth.uid() IS NULL);

-- Allow authenticated clients to see their own data
CREATE POLICY "Clients can view their own data" ON clients
  FOR SELECT USING (auth_user_id = auth.uid());

-- Allow authenticated clients to update their own data  
CREATE POLICY "Clients can update their own data" ON clients
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Update generated_content RLS policies
DROP POLICY IF EXISTS "Clients can view their content via auth" ON generated_content;
DROP POLICY IF EXISTS "Clients can update their content via auth" ON generated_content;

-- Enable RLS on generated_content if not already enabled
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for admin portal (existing behavior)
CREATE POLICY "Anonymous access for admin content" ON generated_content
  FOR ALL USING (auth.uid() IS NULL);

-- Allow authenticated clients to see their content
CREATE POLICY "Clients can view their content via auth" ON generated_content
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Allow authenticated clients to update their content
CREATE POLICY "Clients can update their content via auth" ON generated_content
  FOR UPDATE USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Function to link new auth users to existing clients
CREATE OR REPLACE FUNCTION handle_client_auth_signup()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Link new auth user to existing client record by email
  UPDATE clients 
  SET 
    auth_user_id = NEW.id,
    invitation_status = 'accepted',
    last_login_at = NOW(),
    auth_provider = COALESCE(NEW.app_metadata->>'provider', 'email'),
    updated_at = NOW()
  WHERE email = NEW.email 
    AND auth_user_id IS NULL; -- Only update if not already linked
  
  RETURN NEW;
END;
$$;

-- Create trigger for new auth signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_client_auth_signup();

-- Verify the migration worked
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_clients,
  COUNT(CASE WHEN invitation_status = 'accepted' THEN 1 END) as accepted_clients
FROM clients;