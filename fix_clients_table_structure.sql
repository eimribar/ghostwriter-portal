-- =====================================================
-- FIX CLIENTS TABLE STRUCTURE
-- Ensures the clients table has all required columns
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, let's check the current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients';

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add role column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'role') THEN
        ALTER TABLE clients ADD COLUMN role TEXT;
    END IF;

    -- Add phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'phone') THEN
        ALTER TABLE clients ADD COLUMN phone TEXT;
    END IF;

    -- Add linkedin_bio column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'linkedin_bio') THEN
        ALTER TABLE clients ADD COLUMN linkedin_bio TEXT;
    END IF;

    -- Add industry column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'industry') THEN
        ALTER TABLE clients ADD COLUMN industry TEXT;
    END IF;

    -- Add posting_frequency column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'posting_frequency') THEN
        ALTER TABLE clients ADD COLUMN posting_frequency TEXT DEFAULT '3 times per week';
    END IF;

    -- Add content_preferences column as JSONB
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'content_preferences') THEN
        ALTER TABLE clients ADD COLUMN content_preferences JSONB DEFAULT '{"tone": [], "topics": [], "formats": [], "avoid": []}'::JSONB;
    ELSE
        -- If it exists but isn't JSONB, convert it
        ALTER TABLE clients ALTER COLUMN content_preferences TYPE JSONB USING content_preferences::JSONB;
    END IF;

    -- Add status column with enum check
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'status') THEN
        ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'active';
        ALTER TABLE clients ADD CONSTRAINT clients_status_check 
            CHECK (status IN ('active', 'paused', 'onboarding'));
    END IF;

    -- Add portal_access column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'portal_access') THEN
        ALTER TABLE clients ADD COLUMN portal_access BOOLEAN DEFAULT true;
    END IF;

    -- Add mobile_pin column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'mobile_pin') THEN
        ALTER TABLE clients ADD COLUMN mobile_pin TEXT;
    END IF;

    -- Add created_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'created_at') THEN
        ALTER TABLE clients ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'updated_at') THEN
        ALTER TABLE clients ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add linkedin_url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'linkedin_url') THEN
        ALTER TABLE clients ADD COLUMN linkedin_url TEXT;
    END IF;

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);
CREATE INDEX IF NOT EXISTS idx_clients_portal_access ON clients(portal_access);

-- Update existing rows to have default values where needed
UPDATE clients 
SET 
    status = COALESCE(status, 'active'),
    posting_frequency = COALESCE(posting_frequency, '3 times per week'),
    content_preferences = COALESCE(content_preferences, '{"tone": [], "topics": [], "formats": [], "avoid": []}'::JSONB),
    portal_access = COALESCE(portal_access, true),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE 
    status IS NULL 
    OR posting_frequency IS NULL 
    OR content_preferences IS NULL
    OR portal_access IS NULL
    OR created_at IS NULL
    OR updated_at IS NULL;

-- Final check: Display the updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'clients'
ORDER BY 
    ordinal_position;

-- Test insert to verify everything works
-- This is commented out by default, uncomment to test
/*
INSERT INTO clients (
    name, email, company, role, phone,
    linkedin_url, linkedin_bio, industry,
    posting_frequency, content_preferences,
    status, portal_access, mobile_pin
) VALUES (
    'Test Client',
    'test@example.com',
    'Test Company',
    'CEO',
    '+1234567890',
    'https://linkedin.com/in/test',
    'Test bio',
    'Technology',
    '3 times per week',
    '{"tone": ["professional"], "topics": ["tech"], "formats": ["articles"], "avoid": []}'::JSONB,
    'active',
    true,
    '123456'
) ON CONFLICT (email) DO NOTHING
RETURNING *;
*/

-- Success message
SELECT 'Table structure fixed successfully! All required columns are now present.' as message;