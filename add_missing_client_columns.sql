-- =====================================================
-- ADD MISSING COLUMNS TO CLIENTS TABLE
-- Adds columns required for the new onboarding system
-- =====================================================

-- Add role column if it doesn't exist
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS role TEXT;

-- Add linkedin_bio column if it doesn't exist
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS linkedin_bio TEXT;

-- Ensure content_preferences is JSONB
ALTER TABLE clients 
ALTER COLUMN content_preferences TYPE JSONB USING content_preferences::JSONB;

-- Add status column with proper enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'status') THEN
        ALTER TABLE clients 
        ADD COLUMN status TEXT DEFAULT 'active' 
        CHECK (status IN ('active', 'paused', 'onboarding'));
    END IF;
END $$;

-- Ensure all required columns exist
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS posting_frequency TEXT DEFAULT '3 times per week',
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Update existing rows to have default values if needed
UPDATE clients 
SET 
    status = COALESCE(status, 'active'),
    posting_frequency = COALESCE(posting_frequency, '3 times per week'),
    content_preferences = COALESCE(content_preferences, '{"tone": [], "topics": [], "formats": [], "avoid": []}'::JSONB)
WHERE status IS NULL OR posting_frequency IS NULL OR content_preferences IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);

-- Verify the table structure
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