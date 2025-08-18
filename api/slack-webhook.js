// Slack Webhook Endpoint
// Receives events from Slack (messages, reactions, etc.)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Slack-Signature, X-Slack-Request-Timestamp');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signingSecret = process.env.SLACK_SIGNING_SECRET || process.env.VITE_SLACK_SIGNING_SECRET;
    
    if (!signingSecret) {
      console.error('Missing SLACK_SIGNING_SECRET');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify Slack signature
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    const rawBody = JSON.stringify(req.body);

    // For URL verification challenge
    if (req.body.type === 'url_verification') {
      console.log('Slack URL verification challenge received');
      return res.status(200).json({ challenge: req.body.challenge });
    }

    // TODO: Implement signature verification
    // const isValid = verifySlackSignature(signature, timestamp, rawBody, signingSecret);
    // if (!isValid) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const { type, event, team_id, event_id } = req.body;

    console.log(`📨 Received Slack webhook: ${type}`, { team_id, event_id });

    // Handle different event types
    if (type === 'event_callback') {
      await handleSlackEvent(event, team_id);
    }

    // Always respond quickly to Slack
    res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Error processing Slack webhook:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

async function handleSlackEvent(event, teamId) {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );

  const { type, channel, user, text, ts, thread_ts } = event;

  console.log(`Processing event: ${type} in channel ${channel}`);

  switch (type) {
    case 'message':
      // Check if this channel is being tracked
      const { data: slackChannel } = await supabase
        .from('slack_channels')
        .select('*')
        .eq('channel_id', channel)
        .single();

      if (!slackChannel || !slackChannel.sync_enabled) {
        console.log(`Channel ${channel} not tracked or sync disabled`);
        return;
      }

      // Save the message for processing
      const messageData = {
        channel_id: slackChannel.id,
        message_id: ts,
        user_id: user,
        message_text: text,
        message_type: thread_ts ? 'thread_reply' : 'message',
        thread_ts: thread_ts,
        has_attachments: false,
        is_processed: false,
        converted_to_idea: false,
        slack_timestamp: new Date(parseFloat(ts) * 1000)
      };

      const { error } = await supabase
        .from('slack_messages')
        .upsert([messageData], { onConflict: 'channel_id,message_id' });

      if (error) {
        console.error('Error saving Slack message:', error);
      } else {
        console.log(`💾 Saved message from channel ${channel}`);
        
        // If real-time sync is enabled, process immediately
        if (slackChannel.sync_frequency === 'realtime') {
          // Trigger sync for this message
          await triggerMessageProcessing(slackChannel.id, messageData);
        }
      }
      break;

    case 'reaction_added':
      // Handle reactions (e.g., ✅ to approve an idea)
      console.log(`Reaction ${event.reaction} added to message`);
      break;

    default:
      console.log(`Unhandled event type: ${type}`);
  }
}

async function triggerMessageProcessing(channelId, message) {
  // Import the sync service and process the message
  try {
    // Make an internal API call to process this specific message
    const apiUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/slack-sync`
      : 'http://localhost:3000/api/slack-sync';

    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId,
        messageId: message.message_id,
        realtime: true
      })
    });

    console.log(`🔄 Triggered real-time processing for message ${message.message_id}`);
  } catch (error) {
    console.error('Error triggering message processing:', error);
  }
}