-- Slack Integration Database Schema
-- This enables capturing content ideas from Slack channels

-- 1. Slack Workspaces Table
CREATE TABLE IF NOT EXISTS slack_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_name TEXT NOT NULL,
  workspace_id TEXT UNIQUE NOT NULL, -- Slack's team ID
  bot_token TEXT, -- Encrypted bot token
  bot_user_id TEXT,
  app_id TEXT,
  is_active BOOLEAN DEFAULT true,
  installed_by TEXT,
  installed_at TIMESTAMP DEFAULT NOW(),
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Slack Channels Table
CREATE TABLE IF NOT EXISTS slack_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL, -- Slack's channel ID
  channel_name TEXT NOT NULL,
  channel_type TEXT DEFAULT 'public', -- public, private, dm, mpim
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'daily', -- daily, hourly, realtime
  last_sync_at TIMESTAMP,
  last_message_timestamp TEXT, -- Slack's timestamp of last processed message
  auto_approve BOOLEAN DEFAULT false, -- Auto-approve ideas from this channel
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, channel_id)
);

-- 3. Slack Messages Table (Raw message storage)
CREATE TABLE IF NOT EXISTS slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES slack_channels(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL, -- Slack's message timestamp
  user_id TEXT NOT NULL, -- Slack user ID
  user_name TEXT,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'message', -- message, thread_reply, file_share
  thread_ts TEXT, -- Thread timestamp if it's a reply
  has_attachments BOOLEAN DEFAULT false,
  attachments JSONB, -- Store any attachments/links
  reactions JSONB, -- Store emoji reactions
  is_processed BOOLEAN DEFAULT false,
  converted_to_idea BOOLEAN DEFAULT false,
  idea_id UUID REFERENCES content_ideas(id) ON DELETE SET NULL,
  processing_notes TEXT,
  slack_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, message_id)
);

-- 4. Slack Sync Jobs Table (Track sync operations)
CREATE TABLE IF NOT EXISTS slack_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES slack_channels(id) ON DELETE CASCADE,
  sync_type TEXT DEFAULT 'scheduled', -- scheduled, manual, webhook
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  messages_fetched INTEGER DEFAULT 0,
  ideas_created INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  sync_metadata JSONB, -- Store any additional sync data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Update content_ideas table to support Slack source
-- Add new columns if they don't exist
ALTER TABLE content_ideas 
  ADD COLUMN IF NOT EXISTS slack_message_id UUID REFERENCES slack_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slack_channel_id UUID REFERENCES slack_channels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slack_user_name TEXT,
  ADD COLUMN IF NOT EXISTS original_message_url TEXT;

-- Update the source check constraint to include 'slack'
ALTER TABLE content_ideas 
  DROP CONSTRAINT IF EXISTS content_ideas_source_check;

ALTER TABLE content_ideas 
  ADD CONSTRAINT content_ideas_source_check 
  CHECK (source IN ('trending', 'ai', 'manual', 'content-lake', 'client-request', 'competitor', 'slack'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_slack_workspaces_active ON slack_workspaces(is_active);
CREATE INDEX IF NOT EXISTS idx_slack_channels_workspace ON slack_channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_slack_channels_active ON slack_channels(is_active, sync_enabled);
CREATE INDEX IF NOT EXISTS idx_slack_messages_channel ON slack_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_slack_messages_processed ON slack_messages(is_processed, converted_to_idea);
CREATE INDEX IF NOT EXISTS idx_slack_sync_jobs_status ON slack_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_content_ideas_slack ON content_ideas(slack_message_id, slack_channel_id);

-- Enable RLS
ALTER TABLE slack_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_sync_jobs ENABLE ROW LEVEL SECURITY;

-- Simple policies for admin access
CREATE POLICY "Admin full access to slack_workspaces" ON slack_workspaces
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to slack_channels" ON slack_channels
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to slack_messages" ON slack_messages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to slack_sync_jobs" ON slack_sync_jobs
  FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_slack_workspaces_updated_at
  BEFORE UPDATE ON slack_workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slack_channels_updated_at
  BEFORE UPDATE ON slack_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slack_messages_updated_at
  BEFORE UPDATE ON slack_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slack_sync_jobs_updated_at
  BEFORE UPDATE ON slack_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE slack_workspaces IS 'Stores Slack workspace configurations and credentials';
COMMENT ON TABLE slack_channels IS 'Maps Slack channels to clients/users for content idea capture';
COMMENT ON TABLE slack_messages IS 'Raw storage of Slack messages before processing into ideas';
COMMENT ON TABLE slack_sync_jobs IS 'Tracks sync operations for monitoring and debugging';
COMMENT ON COLUMN content_ideas.slack_message_id IS 'Reference to original Slack message if idea came from Slack';
COMMENT ON COLUMN content_ideas.slack_channel_id IS 'Reference to Slack channel if idea came from Slack';