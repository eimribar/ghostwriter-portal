-- =====================================================
-- ADD CLIENT_ID TO GENERATED_CONTENT TABLE
-- Ensures generated_content can be assigned to clients
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add client_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_content' AND column_name = 'client_id') THEN
        ALTER TABLE generated_content ADD COLUMN client_id UUID;
        
        -- Add foreign key constraint to clients table
        ALTER TABLE generated_content 
        ADD CONSTRAINT generated_content_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
        
        -- Create index for better query performance
        CREATE INDEX idx_generated_content_client_id ON generated_content(client_id);
        
        RAISE NOTICE 'Added client_id column to generated_content table';
    ELSE
        RAISE NOTICE 'client_id column already exists in generated_content table';
    END IF;
END $$;

-- Show current unassigned content
SELECT 
    COUNT(*) as unassigned_count,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as unassigned_drafts,
    COUNT(CASE WHEN status = 'admin_approved' THEN 1 END) as unassigned_approved
FROM generated_content
WHERE client_id IS NULL;

-- Show assigned content by client
SELECT 
    c.name as client_name,
    c.company,
    COUNT(gc.id) as content_count,
    COUNT(CASE WHEN gc.status = 'draft' THEN 1 END) as draft_count,
    COUNT(CASE WHEN gc.status = 'admin_approved' THEN 1 END) as approved_count
FROM clients c
LEFT JOIN generated_content gc ON gc.client_id = c.id
GROUP BY c.id, c.name, c.company
ORDER BY content_count DESC;

-- Success message
SELECT 'Table structure updated! You can now assign content to clients.' as message;