-- =====================================================
-- ADD ARCHIVE AND SCHEDULING FIELDS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add new columns to generated_content table
ALTER TABLE generated_content 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_reason TEXT,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS post_url TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_content_archived ON generated_content(archived);
CREATE INDEX IF NOT EXISTS idx_generated_content_scheduled_for ON generated_content(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_generated_content_posted_at ON generated_content(posted_at);

-- Add check constraint to ensure logical consistency
ALTER TABLE generated_content 
DROP CONSTRAINT IF EXISTS check_archive_consistency,
ADD CONSTRAINT check_archive_consistency 
CHECK (
  (archived = false OR archived_at IS NOT NULL)
);

-- Success message
SELECT 
  '✅ Archive and scheduling fields added successfully!' as message,
  'You can now archive content and track posting status' as details;