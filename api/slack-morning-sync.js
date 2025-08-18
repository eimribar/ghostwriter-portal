// Slack Morning Sync Endpoint
// Scheduled to run every morning to sync all active Slack channels

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // This endpoint can be triggered by GET (for cron) or POST (for manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add authorization check for manual triggers
  const authHeader = req.headers.authorization;
  const isAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET || process.env.VITE_CRON_SECRET}`;
  
  // For Vercel Cron, check if it's coming from Vercel
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  
  if (!isAuthorized && !isVercelCron && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🌅 Starting morning Slack sync...');
  
  const startTime = Date.now();
  const syncResults = {
    success: false,
    timestamp: new Date().toISOString(),
    totalChannels: 0,
    successfulSyncs: 0,
    totalMessages: 0,
    totalIdeasCreated: 0,
    errors: [],
    duration: 0
  };

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const { Resend } = await import('resend');
    
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // Get all active workspaces and channels
    const { data: channels, error: channelsError } = await supabase
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
      .eq('is_active', true)
      .eq('sync_enabled', true)
      .in('sync_frequency', ['daily', 'hourly']); // Only sync daily/hourly channels

    if (channelsError) {
      throw new Error(`Failed to fetch channels: ${channelsError.message}`);
    }

    syncResults.totalChannels = channels?.length || 0;
    console.log(`📊 Found ${syncResults.totalChannels} channels to sync`);

    // Group channels by workspace for efficient API usage
    const channelsByWorkspace = {};
    for (const channel of channels || []) {
      const workspaceId = channel.slack_workspaces?.id;
      if (!workspaceId) continue;
      
      if (!channelsByWorkspace[workspaceId]) {
        channelsByWorkspace[workspaceId] = {
          workspace: channel.slack_workspaces,
          channels: []
        };
      }
      channelsByWorkspace[workspaceId].channels.push(channel);
    }

    // Process each workspace
    for (const [workspaceId, workspaceData] of Object.entries(channelsByWorkspace)) {
      const { workspace, channels: workspaceChannels } = workspaceData;
      
      console.log(`🏢 Processing workspace: ${workspace.workspace_name}`);
      
      for (const channel of workspaceChannels) {
        try {
          console.log(`  📢 Syncing channel: ${channel.channel_name}`);
          
          // Fetch messages from Slack
          const messages = await fetchSlackMessages(
            workspace.bot_token,
            channel.channel_id,
            channel.last_message_timestamp
          );
          
          if (messages.length === 0) {
            console.log(`    No new messages in ${channel.channel_name}`);
            continue;
          }
          
          console.log(`    Found ${messages.length} new messages`);
          syncResults.totalMessages += messages.length;
          
          // Process messages into ideas
          const ideasCreated = await processMessagesToIdeas(
            messages,
            channel,
            workspace,
            supabase
          );
          
          syncResults.totalIdeasCreated += ideasCreated;
          syncResults.successfulSyncs++;
          
          // Update channel last sync
          if (messages.length > 0) {
            const { error: updateError } = await supabase
              .from('slack_channels')
              .update({
                last_sync_at: new Date(),
                last_message_timestamp: messages[0].ts // Most recent message
              })
              .eq('id', channel.id);
              
            if (updateError) {
              console.error(`Failed to update channel last sync: ${updateError.message}`);
            }
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (channelError) {
          console.error(`  ❌ Error syncing channel ${channel.channel_name}:`, channelError);
          syncResults.errors.push({
            channel: channel.channel_name,
            error: channelError.message
          });
        }
      }
    }

    // Create sync summary
    syncResults.success = true;
    syncResults.duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('✅ Morning sync completed:', syncResults);
    
    // Send summary email if configured
    if (process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY) {
      await sendSyncSummaryEmail(syncResults);
    }
    
    // Save sync job record
    const { error: jobError } = await supabase
      .from('slack_sync_jobs')
      .insert([{
        sync_type: isVercelCron ? 'scheduled' : 'manual',
        status: 'completed',
        messages_fetched: syncResults.totalMessages,
        ideas_created: syncResults.totalIdeasCreated,
        started_at: new Date(startTime),
        completed_at: new Date(),
        sync_metadata: syncResults
      }]);
      
    if (jobError) {
      console.error('Failed to save sync job:', jobError);
    }
    
    return res.status(200).json(syncResults);
    
  } catch (error) {
    console.error('❌ Morning sync failed:', error);
    syncResults.errors.push({ global: error.message });
    syncResults.duration = Math.round((Date.now() - startTime) / 1000);
    
    return res.status(500).json({
      ...syncResults,
      error: error.message
    });
  }
}

async function fetchSlackMessages(botToken, channelId, since) {
  try {
    const params = new URLSearchParams({
      channel: channelId,
      limit: '100',
      ...(since && { oldest: since })
    });

    const response = await fetch(`https://slack.com/api/conversations.history?${params}`, {
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data.messages || [];
  } catch (error) {
    console.error('Error fetching Slack messages:', error);
    throw error;
  }
}

async function processMessagesToIdeas(messages, channel, workspace, supabase) {
  let ideasCreated = 0;
  
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
      // Save message to database
      const { data: savedMessage, error: msgError } = await supabase
        .from('slack_messages')
        .upsert([{
          channel_id: channel.id,
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
          slack_timestamp: new Date(parseFloat(message.ts) * 1000)
        }], { onConflict: 'channel_id,message_id' })
        .select()
        .single();
        
      if (msgError) {
        console.error('Error saving message:', msgError);
        continue;
      }
      
      // Parse and create idea
      const ideaData = parseMessageToIdea(message, channel);
      
      if (ideaData) {
        const { data: idea, error: ideaError } = await supabase
          .from('content_ideas')
          .insert([{
            ...ideaData,
            slack_message_id: savedMessage.id,
            slack_channel_id: channel.id,
            source: 'slack',
            status: channel.auto_approve ? 'ready' : 'draft',
            client_id: channel.client_id,
            user_id: channel.user_id,
            used_count: 0
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
    }
  }
  
  return ideasCreated;
}

function parseMessageToIdea(message, channel) {
  const text = message.text.trim();
  
  // Extract title and description
  let title, description;
  
  // Check for structured format
  const structuredMatch = text.match(/^(?:title|idea):\s*(.+?)(?:\n|$)(?:description|details)?:?\s*(.+)?/i);
  if (structuredMatch) {
    title = structuredMatch[1].trim();
    description = structuredMatch[2]?.trim() || structuredMatch[1].trim();
  } else {
    // Use first line as title, full text as description
    const lines = text.split('\n').filter(l => l.trim());
    title = lines[0].substring(0, 100);
    description = text;
  }
  
  // Extract priority
  let priority = 'medium';
  if (text.toLowerCase().includes('urgent') || text.toLowerCase().includes('high priority')) {
    priority = 'high';
  } else if (text.toLowerCase().includes('low priority')) {
    priority = 'low';
  }
  
  // Extract hashtags
  const hashtags = text.match(/#\w+/g)?.map(tag => tag.substring(1)) || [];
  
  return {
    title,
    description,
    priority,
    hashtags,
    slack_user_name: message.user,
    notes: `From Slack channel #${channel.channel_name}`
  };
}

async function sendSyncSummaryEmail(syncResults) {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY);
    
    const adminEmail = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'eimrib@yess.ai';
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a1a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
            .stat { display: inline-block; margin: 10px 20px 10px 0; }
            .stat-value { font-size: 24px; font-weight: bold; color: #333; }
            .stat-label { font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">📨 Slack Sync Summary</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="content">
              <div>
                <div class="stat">
                  <div class="stat-value">${syncResults.totalChannels}</div>
                  <div class="stat-label">Channels Checked</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${syncResults.totalMessages}</div>
                  <div class="stat-label">Messages Processed</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${syncResults.totalIdeasCreated}</div>
                  <div class="stat-label">Ideas Created</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${syncResults.duration}s</div>
                  <div class="stat-label">Duration</div>
                </div>
              </div>
              
              ${syncResults.errors.length > 0 ? `
                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 4px;">
                  <strong>⚠️ Errors:</strong>
                  <ul style="margin: 10px 0 0 0;">
                    ${syncResults.errors.map(e => `<li>${JSON.stringify(e)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              
              <div style="margin-top: 20px; text-align: center;">
                <a href="https://ghostwriter-portal.vercel.app/ideation" style="display: inline-block; padding: 10px 20px; background: #333; color: white; text-decoration: none; border-radius: 4px;">
                  View Ideas →
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    await resend.emails.send({
      from: 'Ghostwriter Portal <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `📨 Slack Sync: ${syncResults.totalIdeasCreated} new ideas from ${syncResults.totalChannels} channels`,
      html: emailHtml
    });
    
    console.log('📧 Sync summary email sent');
  } catch (error) {
    console.error('Failed to send sync summary email:', error);
  }
}