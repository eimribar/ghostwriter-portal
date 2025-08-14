-- Create search_jobs table for background GPT-5 searches
-- This table tracks all search requests and their status

CREATE TABLE IF NOT EXISTS search_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query TEXT NOT NULL,
  search_params JSONB DEFAULT '{}', -- stores topics, industry, target audience, etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_summary TEXT,
  result_count INTEGER DEFAULT 0,
  ideas_generated UUID[], -- array of content_ideas IDs created
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  processing_time_seconds INTEGER, -- how long the search took
  error_message TEXT,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_search_jobs_status ON search_jobs(status);
CREATE INDEX idx_search_jobs_created_at ON search_jobs(created_at DESC);

-- Enable RLS (but keep it simple for admin-only access)
ALTER TABLE search_jobs ENABLE ROW LEVEL SECURITY;

-- Simple policy: allow all operations (since only admin uses this)
CREATE POLICY "Admin full access to search_jobs" ON search_jobs
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_jobs_updated_at
  BEFORE UPDATE ON search_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE search_jobs IS 'Tracks background GPT-5 search jobs for content ideation with email notifications';