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

    // First, check if the channel is private and we need different permissions
    const isPrivateChannel = channel.channel_type === 'private' || channel.channel_id.startsWith('G');
    
    // Fetch messages from Slack API
    const slackParams = new URLSearchParams({
      channel: channel.channel_id,
      limit: '100'
    });
    
    if (channel.last_message_timestamp) {
      slackParams.append('oldest', channel.last_message_timestamp);
    }

    console.log(`📡 Calling Slack API for ${isPrivateChannel ? 'private' : 'public'} channel ${channel.channel_id} with token: xoxb-${workspace.bot_token?.substring(5, 15)}...`);

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
        errorMessage = `Bot is not in channel #${channel.channel_name}. Please go to Slack and:\n1. Open the #${channel.channel_name} channel\n2. Type: /invite @Ghostwriter\n3. Then try syncing again`;
      } else if (slackData.error === 'channel_not_found') {
        errorMessage = 'Channel not found. Please check the channel ID';
      } else if (slackData.error === 'invalid_auth') {
        errorMessage = 'Invalid bot token. Please reconfigure the workspace';
      } else if (slackData.error === 'missing_scope') {
        // Check if it's a private channel issue
        if (isPrivateChannel) {
          errorMessage = 'Bot needs additional permissions for private channels. Please add groups:history and groups:read scopes to your bot token, then reinstall the app.';
        } else {
          errorMessage = 'Bot token missing required permissions. Please ensure your bot has channels:history and channels:read scopes';
        }
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
    const userCache = {}; // Cache user info to avoid repeated API calls

    // Helper function to get user info
    const getUserInfo = async (userId) => {
      if (userCache[userId]) {
        return userCache[userId];
      }
      
      try {
        const userResponse = await fetch(
          `https://slack.com/api/users.info?user=${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${workspace.bot_token}`,
              'Accept': 'application/json'
            }
          }
        );
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.ok && userData.user) {
            const userInfo = {
              real_name: userData.user.real_name || userData.user.name,
              display_name: userData.user.profile?.display_name || userData.user.name,
              avatar: userData.user.profile?.image_48
            };
            userCache[userId] = userInfo;
            return userInfo;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch user info for ${userId}:`, error);
      }
      
      return null;
    };

    // Process each message
    for (const message of messages) {
      // Skip bot messages
      if (message.user === workspace.bot_user_id || message.subtype === 'bot_message') {
        continue;
      }
      
      // Skip system messages (joins, leaves, renames, etc.)
      const systemSubtypes = [
        'channel_join', 'channel_leave', 'channel_name', 'channel_purpose',
        'channel_topic', 'channel_archive', 'channel_unarchive', 'file_share',
        'thread_broadcast', 'bot_add', 'bot_remove', 'group_join', 'group_leave',
        'channel_convert_to_private', 'channel_convert_to_public'
      ];
      
      if (message.subtype && systemSubtypes.includes(message.subtype)) {
        console.log(`⏭️ Skipping system message: ${message.subtype}`);
        continue;
      }
      
      // Skip messages without text or very short messages
      if (!message.text || message.text.trim().length < 50) {
        console.log(`⏭️ Skipping short message: "${message.text?.substring(0, 50)}"`);
        continue;
      }
      
      const trimmedText = message.text.trim();
      
      // CRITICAL: Skip ALL system-like messages
      const systemPatterns = [
        /has joined the channel/i,
        /has left the channel/i,
        /has renamed the channel/i,
        /^<@[A-Z0-9]+>$/,  // Just a user mention
        /^<https?:\/\/[^\s]+>$/,  // Just a URL
        /^<@[A-Z0-9]+> has/i,  // User has done something
        /channel purpose:/i,
        /channel topic:/i,
        /set the channel/i,
        /archived the channel/i,
        /created the channel/i,
        /invited .* to the channel/i,
        /removed .* from the channel/i
      ];
      
      // Check if message matches any system pattern
      const isSystemMessage = systemPatterns.some(pattern => trimmedText.match(pattern));
      if (isSystemMessage) {
        console.log(`⚠️ BLOCKING SYSTEM MESSAGE: "${trimmedText.substring(0, 100)}"`);
        continue;
      }
      
      // Additional check: Skip if the entire message is just user IDs
      if (trimmedText.match(/^(<@[A-Z0-9]+>\s*)+$/)) {
        console.log(`⏭️ Skipping user mention only message`);
        continue;
      }

      try {
        messagesProcessed++;
        
        // Get user info for better attribution
        const userInfo = await getUserInfo(message.user);
        const userName = userInfo?.real_name || userInfo?.display_name || message.user;
        
        // Save message to database
        const { data: savedMessage, error: msgError } = await supabase
          .from('slack_messages')
          .upsert([{
            channel_id: channelId,
            message_id: message.ts,
            user_id: message.user,
            user_name: userName, // Store the actual user name
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
              slack_user_name: userName, // Use the real user name
              source: 'slack',
              status: channel.auto_approve ? 'ready' : 'draft',
              client_id: channel.client_id,
              user_id: channel.user_id,
              used_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              original_message_url: `https://app.slack.com/client/${workspace.workspace_id}/${channel.channel_id}/thread/${channel.channel_id}-${message.ts.replace('.', '')}`
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
  if (!text || text.trim().length < 50) {
    return null;
  }

  const trimmedText = text.trim();
  
  // FINAL CHECK: Never create ideas from system-like messages
  const blockedPhrases = [
    'has joined the channel',
    'has left the channel', 
    'has renamed the channel',
    'was added to',
    'was removed from'
  ];
  
  const lowerText = trimmedText.toLowerCase();
  for (const phrase of blockedPhrases) {
    if (lowerText.includes(phrase)) {
      console.log(`🚫 Blocked idea creation for system message: "${trimmedText.substring(0, 50)}..."`);
      return null;
    }
  }
  
  // Check if message is likely a content idea
  const ideaKeywords = [
    /^!idea\s+/i,
    /^idea:\s*/i,
    /^content idea:\s*/i,
    /^post about:\s*/i,
    /^topic:\s*/i,
    /^suggestion:\s*/i,
    /^blog post:\s*/i,
    /^article:\s*/i,
    /^linkedin post:\s*/i,
    /^💡\s*/,
    /^✍️\s*/,
    /^📝\s*/
  ];
  
  // Check if message starts with any idea keyword
  const hasIdeaKeyword = ideaKeywords.some(pattern => trimmedText.match(pattern));
  
  // If no keyword found and channel doesn't auto-approve, skip
  if (!hasIdeaKeyword && !channel.auto_approve) {
    console.log(`⏭️ Skipping message without idea keyword: "${trimmedText.substring(0, 50)}..."`);
    return null;
  }
  
  // Extract title and description
  let title, description;
  
  // Remove idea prefix if present
  let cleanedText = trimmedText;
  for (const pattern of ideaKeywords) {
    cleanedText = cleanedText.replace(pattern, '');
  }
  cleanedText = cleanedText.trim();
  
  // Check for structured format (Title: ... Description: ...)
  const structuredMatch = cleanedText.match(/^(.+?)(?:\n|\.|\?|!)(.+)?$/s);
  if (structuredMatch) {
    const firstPart = structuredMatch[1].trim();
    const restPart = structuredMatch[2]?.trim();
    
    // Use first sentence/line as title
    title = firstPart.length > 100 ? firstPart.substring(0, 97) + '...' : firstPart;
    description = restPart ? `${firstPart}\n\n${restPart}` : firstPart;
  } else {
    // Use the whole text
    title = cleanedText.length > 100 ? cleanedText.substring(0, 97) + '...' : cleanedText;
    description = cleanedText;
  }
  
  // Clean up Slack formatting
  title = title.replace(/<@[A-Z0-9]+>/g, '@user'); // Replace user mentions
  title = title.replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1'); // Replace channel mentions
  title = title.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2'); // Replace formatted links
  
  description = description.replace(/<@[A-Z0-9]+>/g, '@user');
  description = description.replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1');
  description = description.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2 ($1)');
  
  // Extract priority
  let priority = 'medium';
  const lowerText = trimmedText.toLowerCase();
  if (lowerText.includes('urgent') || lowerText.includes('high priority') || lowerText.includes('asap')) {
    priority = 'high';
  } else if (lowerText.includes('low priority') || lowerText.includes('maybe') || lowerText.includes('someday')) {
    priority = 'low';
  }
  
  // Extract hashtags
  const hashtags = trimmedText.match(/#\w+/g)?.map(tag => tag.substring(1)) || [];
  
  // Determine category based on content
  let category = 'General';
  if (lowerText.includes('product') || lowerText.includes('feature')) category = 'Product';
  else if (lowerText.includes('marketing') || lowerText.includes('campaign')) category = 'Marketing';
  else if (lowerText.includes('sales') || lowerText.includes('revenue')) category = 'Sales';
  else if (lowerText.includes('engineer') || lowerText.includes('technical')) category = 'Engineering';
  else if (lowerText.includes('customer') || lowerText.includes('support')) category = 'Customer Success';
  
  return {
    title,
    description,
    priority,
    hashtags,
    category,
    notes: `From Slack channel #${channel.channel_name}`
  };
}