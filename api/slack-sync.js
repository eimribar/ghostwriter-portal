// Slack Sync API Endpoint
// Handles syncing Slack channels server-side to avoid CORS issues

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { channelId } = req.body;
    
    if (!channelId) {
      return res.status(400).json({ 
        success: false,
        error: 'Channel ID is required' 
      });
    }

    console.log(`🔄 Starting sync for channel ${channelId}`);
    
    // Import Supabase
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // Get channel and workspace info
    const { data: channel, error: channelError } = await supabase
      .from('slack_channels')
      .select(`
        *,
        slack_workspaces (
          id,
          workspace_name,
          workspace_id,
          bot_token,
          bot_user_id
        )
      `)
      .eq('id', channelId)
      .single();

    if (channelError || !channel) {
      console.error('Channel not found:', channelError);
      return res.status(404).json({ 
        success: false,
        error: 'Channel not found' 
      });
    }

    const workspace = channel.slack_workspaces;
    if (!workspace || !workspace.bot_token) {
      return res.status(400).json({ 
        success: false,
        error: 'Workspace not configured properly' 
      });
    }

    console.log(`📊 Fetching messages from Slack channel: ${channel.channel_name}`);

    // Fetch messages from Slack API
    const slackParams = new URLSearchParams({
      channel: channel.channel_id,
      limit: '100'
    });
    
    if (channel.last_message_timestamp) {
      slackParams.append('oldest', channel.last_message_timestamp);
    }

    console.log(`📡 Calling Slack API for channel ${channel.channel_id} with token: xoxb-${workspace.bot_token?.substring(5, 15)}...`);

    const slackResponse = await fetch(
      `https://slack.com/api/conversations.history?${slackParams}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${workspace.bot_token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!slackResponse.ok) {
      console.error('Slack API error:', slackResponse.status, slackResponse.statusText);
      return res.status(500).json({ 
        success: false,
        error: `Slack API error: ${slackResponse.statusText}` 
      });
    }

    const slackData = await slackResponse.json();
    
    if (!slackData.ok) {
      console.error('Slack API returned error:', slackData.error);
      
      // Provide helpful error messages
      let errorMessage = slackData.error;
      if (slackData.error === 'not_in_channel') {
        errorMessage = `Bot is not in channel #${channel.channel_name}. Please go to Slack and:\n1. Open the #${channel.channel_name} channel\n2. Type: /invite @Ghostwriter Content Bot\n3. Then try syncing again`;
      } else if (slackData.error === 'channel_not_found') {
        errorMessage = 'Channel not found. Please check the channel ID';
      } else if (slackData.error === 'invalid_auth') {
        errorMessage = 'Invalid bot token. Please reconfigure the workspace';
      } else if (slackData.error === 'missing_scope') {
        errorMessage = 'Bot token missing required permissions. Please ensure your bot has channels:history and channels:read scopes';
      }
      
      return res.status(400).json({ 
        success: false,
        error: errorMessage,
        details: slackData.error
      });
    }

    const messages = slackData.messages || [];
    console.log(`📥 Fetched ${messages.length} messages from Slack`);

    if (messages.length === 0) {
      // Update last sync timestamp even if no messages
      await supabase
        .from('slack_channels')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', channelId);
        
      return res.status(200).json({
        success: true,
        messagesProcessed: 0,
        ideasCreated: 0,
        message: 'No new messages to process'
      });
    }

    let messagesProcessed = 0;
    let ideasCreated = 0;
    const errors = [];

    // Process each message
    for (const message of messages) {
      // Skip bot messages
      if (message.user === workspace.bot_user_id || message.subtype === 'bot_message') {
        continue;
      }
      
      // Skip very short messages
      if (!message.text || message.text.trim().length < 10) {
        continue;
      }

      try {
        messagesProcessed++;
        
        // Save message to database
        const { data: savedMessage, error: msgError } = await supabase
          .from('slack_messages')
          .upsert([{
            channel_id: channelId,
            message_id: message.ts,
            user_id: message.user,
            message_text: message.text,
            message_type: message.thread_ts ? 'thread_reply' : 'message',
            thread_ts: message.thread_ts,
            has_attachments: !!(message.attachments?.length),
            attachments: message.attachments,
            reactions: message.reactions,
            is_processed: false,
            converted_to_idea: false,
            slack_timestamp: new Date(parseFloat(message.ts) * 1000).toISOString()
          }], { onConflict: 'channel_id,message_id' })
          .select()
          .single();
          
        if (msgError) {
          console.error('Error saving message:', msgError);
          continue;
        }

        // Parse message to create idea
        const ideaData = parseMessageToIdea(message.text, channel);
        
        if (ideaData) {
          const { data: idea, error: ideaError } = await supabase
            .from('content_ideas')
            .insert([{
              ...ideaData,
              slack_message_id: savedMessage.id,
              slack_channel_id: channelId,
              slack_user_name: message.user,
              source: 'slack',
              status: channel.auto_approve ? 'ready' : 'draft',
              client_id: channel.client_id,
              user_id: channel.user_id,
              used_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();
            
          if (!ideaError && idea) {
            ideasCreated++;
            
            // Mark message as processed
            await supabase
              .from('slack_messages')
              .update({
                is_processed: true,
                converted_to_idea: true,
                idea_id: idea.id
              })
              .eq('id', savedMessage.id);
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
        errors.push(error.message);
      }
    }

    // Update channel's last sync info
    const mostRecentTimestamp = messages[0]?.ts;
    if (mostRecentTimestamp) {
      await supabase
        .from('slack_channels')
        .update({
          last_sync_at: new Date().toISOString(),
          last_message_timestamp: mostRecentTimestamp
        })
        .eq('id', channelId);
    }

    // Create sync job record
    await supabase
      .from('slack_sync_jobs')
      .insert([{
        workspace_id: workspace.id,
        channel_id: channelId,
        sync_type: 'manual',
        status: 'completed',
        messages_fetched: messages.length,
        ideas_created: ideasCreated,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      }]);

    console.log(`✅ Sync completed: ${ideasCreated} ideas created from ${messagesProcessed} messages`);

    return res.status(200).json({
      success: true,
      messagesProcessed,
      ideasCreated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully created ${ideasCreated} ideas from ${messagesProcessed} messages`
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to sync channel',
      details: error.message 
    });
  }
}

// Helper function to parse message into idea
function parseMessageToIdea(text, channel) {
  if (!text || text.trim().length < 10) {
    return null;
  }

  const trimmedText = text.trim();
  
  // Extract title and description
  let title, description;
  
  // Check for structured format
  const structuredMatch = trimmedText.match(/^(?:title|idea):\s*(.+?)(?:\n|$)(?:description|details)?:?\s*(.+)?/i);
  if (structuredMatch) {
    title = structuredMatch[1].trim();
    description = structuredMatch[2]?.trim() || structuredMatch[1].trim();
  } else {
    // Use first line as title, full text as description
    const lines = trimmedText.split('\n').filter(l => l.trim());
    title = lines[0].substring(0, 100);
    description = trimmedText;
  }
  
  // Extract priority
  let priority = 'medium';
  const lowerText = trimmedText.toLowerCase();
  if (lowerText.includes('urgent') || lowerText.includes('high priority') || lowerText.includes('asap')) {
    priority = 'high';
  } else if (lowerText.includes('low priority') || lowerText.includes('maybe')) {
    priority = 'low';
  }
  
  // Extract hashtags
  const hashtags = trimmedText.match(/#\w+/g)?.map(tag => tag.substring(1)) || [];
  
  return {
    title,
    description,
    priority,
    hashtags,
    category: 'General',
    notes: `From Slack channel #${channel.channel_name}`
  };
}