-- Migration script to create generated_content table
-- Run this in your Supabase SQL Editor

-- Create the generated_content table
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  idea_id UUID REFERENCES content_ideas(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  ghostwriter_id UUID,
  user_id TEXT,
  variant_number INTEGER DEFAULT 1,
  content_text TEXT NOT NULL,
  hook TEXT,
  hashtags TEXT[],
  estimated_read_time INTEGER,
  llm_provider TEXT CHECK (llm_provider IN ('google', 'anthropic', 'openai')),
  llm_model TEXT,
  generation_prompt TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 
    'admin_approved', 
    'admin_rejected', 
    'client_approved', 
    'client_rejected', 
    'scheduled', 
    'published'
  )),
  revision_notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_content_client_id ON generated_content(client_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);
CREATE INDEX IF NOT EXISTS idx_generated_content_idea_id ON generated_content(idea_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_generated_content_updated_at 
  BEFORE UPDATE ON generated_content 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view all content (for now)
-- You can make this more restrictive later
CREATE POLICY "Authenticated users can view generated content" 
  ON generated_content FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert generated content" 
  ON generated_content FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update generated content" 
  ON generated_content FOR UPDATE 
  USING (true);

CREATE POLICY "Authenticated users can delete generated content" 
  ON generated_content FOR DELETE 
  USING (true);

-- Add some test data to verify the table works
-- Comment out if you don't want test data
/*
INSERT INTO generated_content (
  content_text,
  hook,
  hashtags,
  llm_provider,
  llm_model,
  status
) VALUES (
  'Test content to verify table creation',
  'Test Hook',
  ARRAY['test', 'verification'],
  'google',
  'gemini-2.5-pro',
  'draft'
);
*/

-- Verify the table was created
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'generated_content'
ORDER BY ordinal_position;