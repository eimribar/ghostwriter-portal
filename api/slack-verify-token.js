// Slack Token Verification Endpoint
// Verifies bot token and returns workspace information

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
    const { bot_token } = req.body;
    
    if (!bot_token) {
      return res.status(400).json({ 
        error: 'Bot token is required',
        ok: false 
      });
    }

    // Verify token with Slack API
    console.log('🔐 Verifying Slack bot token...');
    
    const response = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bot_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Slack API request failed:', response.status, response.statusText);
      return res.status(response.status).json({ 
        error: `Slack API error: ${response.statusText}`,
        ok: false 
      });
    }

    const data = await response.json();
    console.log('📊 Slack API response:', { ok: data.ok, team: data.team, user: data.user });
    
    if (!data.ok) {
      console.error('Slack auth test failed:', data.error);
      return res.status(400).json({ 
        error: `Invalid bot token: ${data.error}`,
        details: data.error === 'invalid_auth' 
          ? 'The bot token is invalid. Please check that you copied the entire token starting with xoxb-'
          : data.error === 'account_inactive'
          ? 'The Slack workspace or bot is inactive'
          : data.error === 'token_revoked'
          ? 'The bot token has been revoked. Please generate a new one'
          : 'Please verify your bot token and try again',
        ok: false 
      });
    }

    // Return workspace information
    console.log('✅ Token verified successfully');
    return res.status(200).json({
      ok: true,
      team_id: data.team_id,
      team: data.team,
      user_id: data.user_id,
      user: data.user,
      bot_id: data.bot_id,
      url: data.url
    });

  } catch (error) {
    console.error('❌ Error verifying Slack token:', error);
    return res.status(500).json({ 
      error: 'Failed to verify token',
      details: error.message,
      ok: false
    });
  }
}