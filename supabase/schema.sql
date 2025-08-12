-- Ghostwriter Portal Database Schema
-- Complete schema for LinkedIn Content Engine

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For better text search

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'ghostwriter', 'client', 'viewer')) DEFAULT 'ghostwriter',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CLIENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  website TEXT,
  industry TEXT,
  status TEXT CHECK (status IN ('active', 'paused', 'onboarding', 'churned')) DEFAULT 'onboarding',
  posting_frequency TEXT,
  content_preferences JSONB DEFAULT '{
    "tone": [],
    "topics": [],
    "formats": [],
    "avoid": []
  }',
  brand_guidelines TEXT,
  notes TEXT,
  assigned_ghostwriter UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONTENT CREATORS & SCRAPING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  linkedin_url TEXT UNIQUE NOT NULL,
  profile_image TEXT,
  follower_count INTEGER,
  bio TEXT,
  average_reactions INTEGER,
  content_themes TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  scraping_frequency INTERVAL DEFAULT '7 days',
  quality_threshold INTEGER DEFAULT 100, -- Min reactions to consider
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  original_url TEXT UNIQUE NOT NULL,
  content_text TEXT NOT NULL,
  post_type TEXT CHECK (post_type IN ('text', 'image', 'video', 'carousel', 'document')) DEFAULT 'text',
  reactions_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN (reactions_count + comments_count + shares_count) > 0 
      THEN ((reactions_count + comments_count + shares_count)::DECIMAL / NULLIF(reactions_count, 0) * 100)
      ELSE 0 
    END
  ) STORED,
  media_urls TEXT[],
  hashtags TEXT[],
  mentions TEXT[],
  posted_at TIMESTAMPTZ NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  quality_score DECIMAL(3,2),
  is_promotional BOOLEAN DEFAULT false,
  content_themes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONTENT IDEATION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.content_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  ghostwriter_id UUID REFERENCES public.users(id),
  source_post_id UUID REFERENCES public.content_posts(id) ON DELETE SET NULL,
  source TEXT CHECK (source IN ('trending', 'ai', 'manual', 'content-lake', 'client-request')),
  title TEXT NOT NULL,
  description TEXT,
  hook TEXT,
  key_points TEXT[],
  target_audience TEXT,
  content_format TEXT,
  category TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('draft', 'ready', 'in-progress', 'used', 'archived')) DEFAULT 'draft',
  score INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONTENT GENERATION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID REFERENCES public.content_ideas(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  ghostwriter_id UUID REFERENCES public.users(id),
  variant_number INTEGER NOT NULL,
  content_text TEXT NOT NULL,
  hook TEXT NOT NULL,
  hashtags TEXT[],
  estimated_read_time INTEGER,
  character_count INTEGER GENERATED ALWAYS AS (LENGTH(content_text)) STORED,
  llm_provider TEXT CHECK (llm_provider IN ('openai', 'anthropic', 'google')) NOT NULL,
  llm_model TEXT,
  generation_prompt TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_cost DECIMAL(10,4),
  temperature DECIMAL(2,1),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested', 'published')) DEFAULT 'pending',
  revision_notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id),
  performance_prediction JSONB, -- Predicted engagement metrics
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(idea_id, variant_number)
);

-- =====================================================
-- PROMPTS & TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('hook', 'body', 'cta', 'full', 'ideation', 'optimization')),
  template_text TEXT NOT NULL,
  variables JSONB, -- Variables to be replaced in template
  performance_score DECIMAL(3,2), -- Historical performance
  usage_count INTEGER DEFAULT 0,
  client_specific UUID REFERENCES public.clients(id), -- NULL means global
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SCHEDULING & PUBLISHING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES public.generated_content(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  platform TEXT CHECK (platform IN ('linkedin', 'twitter', 'both')) DEFAULT 'linkedin',
  status TEXT CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')) DEFAULT 'scheduled',
  published_at TIMESTAMPTZ,
  published_url TEXT,
  publish_error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- APPROVAL WORKFLOW
-- =====================================================

CREATE TABLE IF NOT EXISTS public.approval_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES public.generated_content(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  current_stage TEXT CHECK (current_stage IN ('ghostwriter_review', 'internal_review', 'client_review', 'approved', 'rejected')),
  ghostwriter_approved BOOLEAN,
  ghostwriter_notes TEXT,
  internal_approved BOOLEAN,
  internal_notes TEXT,
  client_approved BOOLEAN,
  client_notes TEXT,
  final_status TEXT CHECK (final_status IN ('approved', 'rejected', 'revision_requested')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  action TEXT CHECK (action IN ('approved', 'rejected', 'revision_requested', 'commented')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ANALYTICS & PERFORMANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.content_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  impressions INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  reach INTEGER DEFAULT 0,
  follower_change INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  data_source TEXT CHECK (data_source IN ('linkedin_api', 'manual', 'estimated')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES public.generated_content(id) ON DELETE CASCADE,
  predicted_reactions INTEGER,
  predicted_engagement_rate DECIMAL(5,2),
  confidence_score DECIMAL(3,2),
  factors JSONB, -- Factors influencing prediction
  actual_performance JSONB, -- Actual performance after publishing
  accuracy_score DECIMAL(3,2), -- How accurate was the prediction
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUTOMATION & WORKFLOWS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id), -- NULL means applies to all
  trigger_type TEXT CHECK (trigger_type IN ('schedule', 'event', 'condition')),
  trigger_config JSONB,
  action_type TEXT CHECK (action_type IN ('scrape', 'generate', 'approve', 'publish', 'notify')),
  action_config JSONB,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('success', 'failed', 'partial')),
  details JSONB,
  error_message TEXT,
  items_processed INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('approval_needed', 'content_published', 'error', 'reminder', 'performance_alert')),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- API KEYS & SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service TEXT CHECK (service IN ('openai', 'anthropic', 'google', 'apify', 'cloudinary')),
  api_key_encrypted TEXT, -- Store encrypted
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service)
);

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Content searching
CREATE INDEX idx_content_posts_creator ON public.content_posts(creator_id);
CREATE INDEX idx_content_posts_quality ON public.content_posts(quality_score DESC);
CREATE INDEX idx_content_posts_posted ON public.content_posts(posted_at DESC);
CREATE INDEX idx_content_posts_engagement ON public.content_posts(engagement_rate DESC);
CREATE INDEX idx_content_posts_text_search ON public.content_posts USING gin(to_tsvector('english', content_text));

-- Ideas and generation
CREATE INDEX idx_content_ideas_client ON public.content_ideas(client_id);
CREATE INDEX idx_content_ideas_status ON public.content_ideas(status);
CREATE INDEX idx_generated_content_client ON public.generated_content(client_id);
CREATE INDEX idx_generated_content_status ON public.generated_content(status);

-- Scheduling
CREATE INDEX idx_scheduled_posts_date ON public.scheduled_posts(scheduled_for);
CREATE INDEX idx_scheduled_posts_client ON public.scheduled_posts(client_id);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);

-- Analytics
CREATE INDEX idx_analytics_client ON public.content_analytics(client_id);
CREATE INDEX idx_analytics_date ON public.content_analytics(recorded_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Policies for content (ghostwriters can see their assigned clients' content)
CREATE POLICY "Ghostwriters can manage assigned client content" ON public.content_ideas
  FOR ALL USING (
    ghostwriter_id = auth.uid() OR
    client_id IN (SELECT id FROM public.clients WHERE assigned_ghostwriter = auth.uid())
  );

-- Admin policies (admins can see everything)
CREATE POLICY "Admins have full access" ON public.users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_ideas_updated_at BEFORE UPDATE ON public.content_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_content_updated_at BEFORE UPDATE ON public.generated_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate content quality score
CREATE OR REPLACE FUNCTION calculate_quality_score(
  reactions INTEGER,
  comments INTEGER,
  shares INTEGER,
  follower_count INTEGER
) RETURNS DECIMAL AS $$
BEGIN
  IF follower_count IS NULL OR follower_count = 0 THEN
    RETURN 0;
  END IF;
  
  -- Weighted formula: reactions (1x) + comments (2x) + shares (3x) / followers
  RETURN LEAST(1.0, ((reactions + (comments * 2) + (shares * 3))::DECIMAL / follower_count * 100));
END;
$$ LANGUAGE plpgsql;

-- Function to get trending topics
CREATE OR REPLACE FUNCTION get_trending_topics(
  time_window INTERVAL DEFAULT '7 days',
  limit_count INTEGER DEFAULT 10
) RETURNS TABLE(topic TEXT, mention_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    UNNEST(hashtags) as topic,
    COUNT(*) as mention_count
  FROM public.content_posts
  WHERE posted_at > NOW() - time_window
    AND quality_score > 0.7
  GROUP BY topic
  ORDER BY mention_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA (Optional - for testing)
-- =====================================================

-- Insert sample prompt templates
INSERT INTO public.prompt_templates (name, category, template_text, variables) VALUES
('Hook - Controversial Statement', 'hook', 'Unpopular opinion: {controversial_statement}

But here''s why I believe it''s true...', '{"controversial_statement": "Your controversial take"}'::jsonb),
('Hook - Personal Story', 'hook', '{time_period} ago, I {past_situation}.

Today, {current_situation}.

Here''s what changed:', '{"time_period": "X years", "past_situation": "struggled with...", "current_situation": "I successfully..."}'::jsonb),
('Body - Listicle', 'body', 'Here are {number} {item_type} that {benefit}:

{list_items}

Which one resonates most with you?', '{"number": "5", "item_type": "strategies", "benefit": "will transform your approach", "list_items": "1. First item\n2. Second item..."}'::jsonb),
('CTA - Engagement', 'cta', 'What''s your experience with {topic}?

Share your thoughts below 👇

{hashtags}', '{"topic": "this challenge", "hashtags": "#YourHashtags"}'::jsonb);

-- Note: Real API keys should be stored encrypted and managed securely
-- This is just the schema setup