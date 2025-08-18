# Slack Integration Documentation

## Overview
The Ghostwriter Portal now supports Slack integration for capturing content ideas directly from Slack channels. Users can share ideas in dedicated Slack channels, and the system will automatically sync and process them into the content ideation pipeline.

## Features

### 1. Multi-Workspace Support
- Connect multiple Slack workspaces
- Manage different teams and organizations
- Secure bot token storage

### 2. Channel Management
- Add specific channels for monitoring
- Configure sync frequency (daily, hourly, real-time)
- Auto-approve settings for trusted channels
- Enable/disable channels without removing them

### 3. Message Processing
- Intelligent message parsing
- Automatic idea extraction
- Priority detection from keywords
- Hashtag extraction
- User attribution

### 4. Sync Options
- **Morning Automation**: Daily sync at 9 AM (configurable)
- **Manual Sync**: On-demand sync from settings page
- **Real-time Webhooks**: Instant processing for critical channels
- **Background Processing**: Non-blocking sync operations

## Setup Guide

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "Ghostwriter Content Bot")
4. Select your workspace

### 2. Configure OAuth Scopes

Navigate to "OAuth & Permissions" and add these Bot Token Scopes:
- `channels:history` - Read messages from public channels
- `channels:read` - View basic channel information
- `groups:history` - Read messages from private channels (if needed)
- `groups:read` - View private channel information (if needed)
- `chat:write` - Post messages (for confirmations)
- `users:read` - Get user information

### 3. Install App to Workspace

1. Click "Install to Workspace"
2. Authorize the requested permissions
3. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 4. Set Up Event Subscriptions (Optional for Real-time)

1. Go to "Event Subscriptions"
2. Enable Events
3. Set Request URL: `https://ghostwriter-portal.vercel.app/api/slack-webhook`
4. Subscribe to bot events:
   - `message.channels`
   - `message.groups` (for private channels)
5. Save changes

### 5. Configure in Ghostwriter Portal

1. Navigate to Slack Settings (`/slack-settings`)
2. Click "Add Workspace"
3. Enter:
   - Workspace Name
   - Bot Token (from step 3)
   - App ID (optional, found in Basic Information)
4. Add channels to monitor

## Environment Variables

Add these to your `.env.local` and Vercel environment:

```bash
# Slack Integration
SLACK_SIGNING_SECRET=your_signing_secret  # From Basic Information → App Credentials
VITE_SLACK_SIGNING_SECRET=your_signing_secret

# Optional: For cron job authentication
CRON_SECRET=your_random_secret
VITE_CRON_SECRET=your_random_secret
```

## Message Format Guidelines

The system intelligently parses messages, but structured formats work best:

### Basic Format
```
Any message with meaningful content will be captured as an idea
```

### Structured Format
```
Title: How to Scale Your SaaS to $10M ARR
Description: A comprehensive guide covering pricing strategies, sales processes, and growth tactics for B2B SaaS companies
```

### With Priority
```
URGENT: We need content about the new AI regulations
This is high priority for next week's campaign
```

### With Hashtags
```
New idea: Customer success best practices #saas #retention #growth
```

## Sync Frequencies

### Daily (Default)
- Syncs once per day at 9 AM
- Best for general ideation channels
- Lowest API usage

### Hourly
- Syncs every hour
- Good for active channels
- Moderate API usage

### Real-time
- Processes messages instantly via webhooks
- Best for time-sensitive content
- Requires webhook setup

## Database Schema

### slack_workspaces
- Stores workspace credentials and configuration
- Bot tokens are stored securely
- Tracks last sync timestamps

### slack_channels
- Maps channels to clients/users
- Sync settings and frequency
- Auto-approval configuration

### slack_messages
- Raw message storage
- Processing status tracking
- Links to generated ideas

### slack_sync_jobs
- Sync operation history
- Performance metrics
- Error tracking

## API Endpoints

### `/api/slack-webhook`
- Receives Slack events
- URL verification
- Real-time message processing

### `/api/slack-morning-sync`
- Scheduled daily sync (9 AM)
- Processes all active channels
- Sends summary email

### Manual Sync (via UI)
- Triggered from Slack Settings page
- Per-channel sync option
- Immediate processing

## Automation Flow

1. **Morning Sync (9 AM Daily)**
   - Fetches all active workspaces
   - Processes new messages from each channel
   - Creates content ideas with appropriate metadata
   - Sends summary email to admin

2. **Message Processing**
   - Extracts title and description
   - Detects priority level
   - Identifies hashtags
   - Links to original Slack message
   - Attributes to Slack user

3. **Idea Creation**
   - Status: 'draft' (or 'ready' if auto-approve)
   - Source: 'slack'
   - Includes Slack metadata
   - Visible in Ideation page

## Monitoring & Troubleshooting

### Check Sync Status
- View last sync time in Slack Settings
- Monitor sync jobs in database
- Check email notifications

### Common Issues

**Bot can't see messages**
- Ensure bot is added to the channel
- Check OAuth scopes
- Verify channel type permissions

**Sync not running**
- Check Vercel cron logs
- Verify environment variables
- Test manual sync first

**Ideas not appearing**
- Check message parsing logic
- Verify database connections
- Review sync job errors

## Security Considerations

1. **Token Storage**
   - Bot tokens stored in database
   - Use environment variables for signing secrets
   - Rotate tokens periodically

2. **Access Control**
   - Limit bot to necessary channels only
   - Use private channels for sensitive content
   - Review workspace permissions regularly

3. **Data Privacy**
   - Messages stored temporarily
   - Only processed messages saved
   - User attribution respects privacy

## Best Practices

1. **Channel Organization**
   - One channel per client or topic
   - Clear naming conventions
   - Regular cleanup of old ideas

2. **Message Quality**
   - Encourage structured formats
   - Use reactions for voting
   - Thread discussions for context

3. **Sync Management**
   - Start with daily sync
   - Upgrade to hourly for active channels
   - Use real-time sparingly

## Roadmap

- [ ] Slack command integration (/idea)
- [ ] Reaction-based prioritization
- [ ] Thread context inclusion
- [ ] File attachment support
- [ ] Multi-language support
- [ ] Slack notification on idea approval
- [ ] Bulk operations from Slack
- [ ] Analytics dashboard for Slack ideas

## Support

For issues or questions:
- Check sync job logs in database
- Review Vercel function logs
- Contact: eimrib@yess.ai