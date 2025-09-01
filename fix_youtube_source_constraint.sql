-- Fix content_ideas table to allow 'youtube' as a valid source
-- This allows YouTube-generated ideas to show properly in the platform

-- Drop the existing CHECK constraint
ALTER TABLE content_ideas DROP CONSTRAINT IF EXISTS content_ideas_source_check;

-- Add the updated CHECK constraint that includes 'youtube'
ALTER TABLE content_ideas ADD CONSTRAINT content_ideas_source_check 
CHECK (source IN ('trending', 'ai', 'manual', 'content-lake', 'client-request', 'competitor', 'slack', 'youtube'));

-- Update TypeScript interface source type to match database (for reference)
-- The ContentIdeaDB interface already includes 'youtube' in the source union type

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully updated content_ideas source constraint to allow youtube';
END $$;