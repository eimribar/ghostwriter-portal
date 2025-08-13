-- Insert Test Data for Ghostwriter Portal
-- This script adds test clients and users to enable testing of the content generation and approval flow

-- First, ensure the clients table exists (if not already created)
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    industry VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Insert test clients
INSERT INTO clients (id, name, company, email, industry, status) 
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'John Smith', 'TechCorp Solutions', 'john@techcorp.com', 'Technology', 'active'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'Marketing Dynamics', 'sarah@marketingdynamics.com', 'Marketing', 'active'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Michael Chen', 'Finance Plus', 'michael@financeplus.com', 'Finance', 'active'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Emma Williams', 'Healthcare Innovations', 'emma@healthinnovations.com', 'Healthcare', 'active'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Demo Client', 'Demo Company', 'demo@example.com', 'General', 'active')
ON CONFLICT (email) DO UPDATE 
SET 
    name = EXCLUDED.name,
    company = EXCLUDED.company,
    industry = EXCLUDED.industry,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

-- Ensure the users table exists and has some test users
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'client' CHECK (role IN ('admin', 'ghostwriter', 'client')),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert test users (ghostwriters and clients)
INSERT INTO users (id, email, full_name, role, client_id, has_completed_onboarding)
VALUES
    -- Ghostwriters/Admins
    ('660e8400-e29b-41d4-a716-446655440001', 'admin@ghostwriter.com', 'Admin User', 'admin', NULL, TRUE),
    ('660e8400-e29b-41d4-a716-446655440002', 'writer1@ghostwriter.com', 'Writer One', 'ghostwriter', NULL, TRUE),
    
    -- Client users (linked to clients)
    ('660e8400-e29b-41d4-a716-446655440003', 'john@techcorp.com', 'John Smith', 'client', '550e8400-e29b-41d4-a716-446655440001', TRUE),
    ('660e8400-e29b-41d4-a716-446655440004', 'sarah@marketingdynamics.com', 'Sarah Johnson', 'client', '550e8400-e29b-41d4-a716-446655440002', TRUE),
    ('660e8400-e29b-41d4-a716-446655440005', 'demo@example.com', 'Demo User', 'client', '550e8400-e29b-41d4-a716-446655440005', TRUE)
ON CONFLICT (email) DO UPDATE
SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    client_id = EXCLUDED.client_id,
    has_completed_onboarding = EXCLUDED.has_completed_onboarding,
    updated_at = CURRENT_TIMESTAMP;

-- Add some sample content ideas for testing
INSERT INTO content_ideas (id, client_id, user_id, title, description, source, priority, status)
VALUES
    ('770e8400-e29b-41d4-a716-446655440001', 
     '550e8400-e29b-41d4-a716-446655440005', 
     '660e8400-e29b-41d4-a716-446655440002',
     'AI in Customer Service',
     'How artificial intelligence is revolutionizing customer support and engagement',
     'manual',
     'high',
     'draft'),
    ('770e8400-e29b-41d4-a716-446655440002', 
     '550e8400-e29b-41d4-a716-446655440005', 
     '660e8400-e29b-41d4-a716-446655440002',
     'Remote Work Best Practices',
     'Essential tips for managing distributed teams effectively',
     'manual',
     'medium',
     'draft')
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON clients TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON content_ideas TO authenticated;
GRANT ALL ON generated_content TO authenticated;

-- Enable Row Level Security (if not already enabled)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for test data access
CREATE POLICY "Enable all access for authenticated users during testing" ON clients
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users during testing" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Output confirmation
DO $$
BEGIN
    RAISE NOTICE 'Test data inserted successfully!';
    RAISE NOTICE 'Test clients created: 5';
    RAISE NOTICE 'Test users created: 5 (2 ghostwriters, 3 clients)';
    RAISE NOTICE 'Test content ideas created: 2';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now log in with:';
    RAISE NOTICE '  Admin: admin@ghostwriter.com';
    RAISE NOTICE '  Writer: writer1@ghostwriter.com';
    RAISE NOTICE '  Client: demo@example.com';
END $$;