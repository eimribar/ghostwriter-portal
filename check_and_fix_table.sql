-- First, let's check if the table exists and what columns it has
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'generated_content'
ORDER BY ordinal_position;

-- Check if there's any data in the table
SELECT COUNT(*) as total_records FROM generated_content;

-- Check the most recent records to see what's there
SELECT * FROM generated_content 
ORDER BY created_at DESC 
LIMIT 5;

-- If you need to add missing columns (run only what's needed):

-- Add status column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'status'
  ) THEN
    ALTER TABLE generated_content 
    ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN (
      'draft', 
      'admin_approved', 
      'admin_rejected', 
      'client_approved', 
      'client_rejected', 
      'scheduled', 
      'published'
    ));
  END IF;
END $$;

-- Add client_id column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE generated_content 
    ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add other potentially missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN user_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'ghostwriter_id'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN ghostwriter_id UUID;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'variant_number'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN variant_number INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'hashtags'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN hashtags TEXT[];
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'estimated_read_time'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN estimated_read_time INTEGER;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'llm_provider'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN llm_provider TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'llm_model'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN llm_model TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'generation_prompt'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN generation_prompt TEXT;
  END IF;
END $$;

-- Update any existing records that have old status values
UPDATE generated_content 
SET status = 'draft' 
WHERE status = 'pending';

-- Check the final structure
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'generated_content'
ORDER BY ordinal_position;