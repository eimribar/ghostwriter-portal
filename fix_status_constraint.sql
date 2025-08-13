-- Check current constraints on the table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'generated_content'::regclass
AND contype = 'c';

-- Drop the old status constraint
ALTER TABLE generated_content 
DROP CONSTRAINT IF EXISTS generated_content_status_check;

-- Add the new status constraint with our expected values
ALTER TABLE generated_content 
ADD CONSTRAINT generated_content_status_check 
CHECK (status IN (
    'draft', 
    'admin_approved', 
    'admin_rejected', 
    'client_approved', 
    'client_rejected', 
    'scheduled', 
    'published',
    'pending',  -- Add this for backward compatibility
    'approved', -- Add this for backward compatibility
    'rejected'  -- Add this for backward compatibility
));

-- Test insert with 'draft' status
INSERT INTO generated_content (
  content_text,
  hook,
  status,
  llm_provider,
  variant_number
) VALUES (
  'Test content with draft status',
  'Test hook',
  'draft',
  'google',
  1
) RETURNING id, status, created_at;

-- Verify the insert worked
SELECT id, status, content_text, created_at 
FROM generated_content 
ORDER BY created_at DESC 
LIMIT 5;