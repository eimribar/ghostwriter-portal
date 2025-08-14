-- Create content_ideas table for storing all content ideation data
-- This table stores ideas from multiple sources: AI-generated, trending, manual, content-lake

-- Drop existing table if it exists (be careful in production!)
DROP TABLE IF EXISTS content_ideas CASCADE;

-- Create the content_ideas table
CREATE TABLE content_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    ghostwriter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    source_post_id UUID, -- Reference to content_lake posts if applicable
    
    -- Source and metadata
    source VARCHAR(50) CHECK (source IN ('trending', 'ai', 'manual', 'content-lake', 'client-request', 'competitor')),
    
    -- Core content
    title VARCHAR(500) NOT NULL,
    description TEXT,
    hook TEXT, -- The attention-grabbing opening line
    
    -- Content details
    key_points TEXT[], -- Array of key talking points
    target_audience VARCHAR(255),
    content_format VARCHAR(100), -- e.g., 'thought-leadership', 'how-to', 'case-study'
    category VARCHAR(100),
    
    -- Priority and status
    priority VARCHAR(20) CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    status VARCHAR(50) CHECK (status IN ('draft', 'ready', 'in-progress', 'used', 'archived', 'rejected')) DEFAULT 'draft',
    
    -- Scoring and analytics
    score DECIMAL(3,1), -- AI-generated quality/engagement score (0-10)
    predicted_engagement INTEGER, -- Predicted engagement count
    actual_engagement INTEGER, -- Actual engagement if content was published
    
    -- AI generation details
    ai_model VARCHAR(100), -- Which AI model generated this (gpt-5, gemini, etc.)
    ai_reasoning_effort VARCHAR(20), -- For GPT-5: minimal, low, medium, high
    ai_generation_params JSONB, -- Store all AI generation parameters
    
    -- LinkedIn specific
    linkedin_style VARCHAR(100), -- e.g., 'professional', 'casual', 'provocative'
    hashtags TEXT[], -- Suggested hashtags
    optimal_posting_time TIMESTAMP WITH TIME ZONE,
    
    -- Competitor/trend analysis
    competitor_reference VARCHAR(255), -- If inspired by competitor content
    trend_reference VARCHAR(255), -- If based on trending topic
    trend_growth_rate VARCHAR(50), -- e.g., '+23%' growth rate
    
    -- Content expansion
    expanded_content JSONB, -- Full expanded version of the idea
    content_variations JSONB, -- Different variations of the same idea
    
    -- Collaboration
    notes TEXT, -- Internal notes about the idea
    feedback TEXT, -- Feedback from client or team
    rejection_reason TEXT, -- If rejected, why?
    
    -- Usage tracking
    used_in_content_id UUID, -- Reference to generated_content if this idea was used
    used_count INTEGER DEFAULT 0, -- How many times this idea has been used
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scheduled_for TIMESTAMP WITH TIME ZONE, -- When to revisit or use this idea
    archived_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Create indexes for better query performance
CREATE INDEX idx_content_ideas_client_id ON content_ideas(client_id);
CREATE INDEX idx_content_ideas_status ON content_ideas(status);
CREATE INDEX idx_content_ideas_priority ON content_ideas(priority);
CREATE INDEX idx_content_ideas_source ON content_ideas(source);
CREATE INDEX idx_content_ideas_category ON content_ideas(category);
CREATE INDEX idx_content_ideas_created_at ON content_ideas(created_at DESC);
CREATE INDEX idx_content_ideas_score ON content_ideas(score DESC);
CREATE INDEX idx_content_ideas_ghostwriter_id ON content_ideas(ghostwriter_id);

-- Create full-text search index for title and description
CREATE INDEX idx_content_ideas_search ON content_ideas 
USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Add RLS (Row Level Security) policies
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all ideas
CREATE POLICY "authenticated_read_ideas" ON content_ideas
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Users can create ideas
CREATE POLICY "authenticated_create_ideas" ON content_ideas
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Users can update their own ideas or ideas assigned to them
CREATE POLICY "authenticated_update_ideas" ON content_ideas
    FOR UPDATE
    TO authenticated
    USING (
        ghostwriter_id = auth.uid() OR 
        user_id = auth.uid() OR
        client_id IN (
            SELECT id FROM clients 
            WHERE assigned_ghostwriter = auth.uid()
        )
    );

-- Policy: Soft delete (archive) ideas
CREATE POLICY "authenticated_archive_ideas" ON content_ideas
    FOR UPDATE
    TO authenticated
    USING (
        ghostwriter_id = auth.uid() OR 
        user_id = auth.uid()
    )
    WITH CHECK (
        archived_at IS NOT NULL
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_content_ideas_updated_at 
    BEFORE UPDATE ON content_ideas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON content_ideas TO authenticated;
GRANT SELECT ON content_ideas TO anon;

-- Insert some sample data for testing (optional)
INSERT INTO content_ideas (
    title,
    description,
    hook,
    source,
    category,
    priority,
    status,
    score,
    key_points,
    target_audience,
    content_format,
    hashtags,
    ai_model,
    linkedin_style
) VALUES 
(
    'The Hidden Cost of Perfectionism in Startup Culture',
    'Explore how perfectionism can slow down innovation and what founders can do to balance quality with speed.',
    'Perfectionism killed more startups than competition ever did.',
    'ai',
    'Startup Culture',
    'high',
    'ready',
    9.2,
    ARRAY['Ship fast and iterate', 'Perfect is the enemy of good', 'Customer feedback beats internal debates', 'Set quality thresholds, not perfection goals'],
    'Startup founders and product managers',
    'thought-leadership',
    ARRAY['startup', 'productivity', 'leadership', 'innovation'],
    'gpt-5',
    'provocative'
),
(
    'Why Your Best Employees Leave (And How to Keep Them)',
    'Data-driven insights into employee retention based on surveys of 1000+ tech professionals.',
    '87% of top performers leave for reasons you can actually fix.',
    'trending',
    'HR & Culture',
    'high',
    'ready',
    8.5,
    ARRAY['Growth opportunities matter more than salary', 'Autonomy drives engagement', 'Recognition systems are broken', 'Career paths need clarity'],
    'HR leaders and executives',
    'data-driven',
    ARRAY['hr', 'retention', 'leadership', 'culture'],
    'gpt-5',
    'professional'
),
(
    'Building in Public: Month 1 Learnings',
    'Share authentic journey of building a product with full transparency.',
    'I made $0 this month. Here''s why that''s exactly what I wanted.',
    'manual',
    'Build in Public',
    'medium',
    'draft',
    7.8,
    ARRAY['Validation before monetization', 'Community feedback is gold', 'Transparency builds trust', 'Document everything'],
    'Entrepreneurs and indie makers',
    'case-study',
    ARRAY['buildinpublic', 'entrepreneur', 'startup', 'transparency'],
    NULL,
    'casual'
);

-- Add comments for documentation
COMMENT ON TABLE content_ideas IS 'Stores all content ideas from various sources for LinkedIn content generation';
COMMENT ON COLUMN content_ideas.source IS 'Origin of the idea: trending, ai, manual, content-lake, client-request, competitor';
COMMENT ON COLUMN content_ideas.score IS 'AI-predicted quality/engagement score from 0-10';
COMMENT ON COLUMN content_ideas.ai_reasoning_effort IS 'GPT-5 specific: reasoning effort level used';
COMMENT ON COLUMN content_ideas.expanded_content IS 'JSON object containing fully expanded version of the idea';
COMMENT ON COLUMN content_ideas.content_variations IS 'JSON array of different variations of the same idea';

-- Create a view for active ideas (not archived)
CREATE VIEW active_content_ideas AS
SELECT * FROM content_ideas
WHERE archived_at IS NULL
ORDER BY 
    CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
    END,
    score DESC NULLS LAST,
    created_at DESC;

-- Create a materialized view for idea analytics
CREATE MATERIALIZED VIEW content_ideas_analytics AS
SELECT 
    category,
    source,
    COUNT(*) as total_ideas,
    COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_ideas,
    COUNT(CASE WHEN status = 'used' THEN 1 END) as used_ideas,
    AVG(score) as avg_score,
    MAX(score) as max_score,
    COUNT(DISTINCT client_id) as unique_clients
FROM content_ideas
WHERE archived_at IS NULL
GROUP BY category, source;

-- Create index on materialized view
CREATE INDEX idx_ideas_analytics_category ON content_ideas_analytics(category);

-- Refresh materialized view (run periodically)
-- REFRESH MATERIALIZED VIEW content_ideas_analytics;

COMMENT ON MATERIALIZED VIEW content_ideas_analytics IS 'Aggregated analytics for content ideas by category and source';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Content ideas table created successfully with indexes, RLS policies, and sample data!';
END $$;