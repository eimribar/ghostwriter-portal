// Slack Sync Service
// Orchestrates the sync process and transforms Slack messages to content ideas

import { slackService, type SlackMessage, type SlackChannel, type SlackWorkspace } from './slack.service';
import { contentIdeasService, type ContentIdeaDB } from './database.service';
import { supabase } from '../lib/supabase';

export interface SyncResult {
  success: boolean;
  messagesProcessed: number;
  ideasCreated: number;
  errors: string[];
  syncJobId?: string;
}

export interface ParsedIdea {
  title: string;
  description: string;
  category?: string;
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
}

class SlackSyncService {
  
  // Main sync function for a channel
  async syncChannel(channelId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      messagesProcessed: 0,
      ideasCreated: 0,
      errors: []
    };

    try {
      // Get channel details
      const { data: channel, error: channelError } = await supabase
        .from('slack_channels')
        .select('*, slack_workspaces(*)')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) {
        result.errors.push('Channel not found');
        return result;
      }

      const workspace = channel.slack_workspaces;
      if (!workspace || !workspace.bot_token) {
        result.errors.push('Workspace not configured');
        return result;
      }

      // Create sync job
      const { data: syncJob, error: jobError } = await supabase
        .from('slack_sync_jobs')
        .insert([{
          workspace_id: workspace.id,
          channel_id: channelId,
          sync_type: 'manual',
          status: 'processing',
          started_at: new Date()
        }])
        .select()
        .single();

      if (syncJob) {
        result.syncJobId = syncJob.id;
      }

      // Fetch messages from Slack
      const messages = await slackService.fetchChannelMessages(
        workspace.bot_token,
        channel.channel_id,
        channel.last_message_timestamp
      );

      console.log(`📥 Fetched ${messages.length} messages from Slack channel ${channel.channel_name}`);

      // Save raw messages to database
      const slackMessages: Omit<SlackMessage, 'id'>[] = [];
      for (const msg of messages) {
        // Skip bot messages and system messages
        if (msg.type !== 'message' || msg.user === workspace.bot_user_id) {
          continue;
        }

        slackMessages.push({
          channel_id: channelId,
          message_id: msg.ts,
          user_id: msg.user,
          message_text: msg.text,
          message_type: msg.thread_ts ? 'thread_reply' : 'message',
          thread_ts: msg.thread_ts,
          has_attachments: !!(msg.attachments && msg.attachments.length > 0),
          attachments: msg.attachments,
          reactions: msg.reactions,
          is_processed: false,
          converted_to_idea: false,
          slack_timestamp: new Date(parseFloat(msg.ts) * 1000)
        });
      }

      // Save messages to database
      const savedMessages = await slackService.saveMessages(slackMessages);
      result.messagesProcessed = savedMessages.length;

      // Process messages into ideas
      for (const message of savedMessages) {
        try {
          const idea = await this.processMessageToIdea(message, channel);
          if (idea) {
            result.ideasCreated++;
            await slackService.markMessageProcessed(message.id!, idea.id);
          }
        } catch (error: any) {
          console.error(`Error processing message ${message.id}:`, error);
          result.errors.push(`Message ${message.id}: ${error.message}`);
        }
      }

      // Update channel last sync
      if (messages.length > 0) {
        await slackService.updateChannelLastSync(
          channelId,
          messages[0].ts // Most recent message timestamp
        );
      }

      // Update sync job
      if (syncJob) {
        await supabase
          .from('slack_sync_jobs')
          .update({
            status: 'completed',
            completed_at: new Date(),
            messages_fetched: result.messagesProcessed,
            ideas_created: result.ideasCreated
          })
          .eq('id', syncJob.id);
      }

      result.success = true;
      console.log(`✅ Sync completed: ${result.ideasCreated} ideas created from ${result.messagesProcessed} messages`);

    } catch (error: any) {
      console.error('Sync error:', error);
      result.errors.push(error.message);
      
      // Update sync job as failed
      if (result.syncJobId) {
        await supabase
          .from('slack_sync_jobs')
          .update({
            status: 'failed',
            completed_at: new Date(),
            error_message: error.message
          })
          .eq('id', result.syncJobId);
      }
    }

    return result;
  }

  // Process a single message into a content idea
  private async processMessageToIdea(
    message: SlackMessage,
    channel: SlackChannel
  ): Promise<ContentIdeaDB | null> {
    try {
      // Parse the message to extract idea components
      const parsedIdea = this.parseMessage(message.message_text);
      
      if (!parsedIdea) {
        // Mark as processed but not converted
        await slackService.markMessageProcessed(message.id!, undefined);
        return null;
      }

      // Get user info if possible (for attribution)
      let userName = message.user_name;
      if (!userName && channel.slack_workspaces?.bot_token) {
        try {
          const userInfo = await slackService.getUserInfo(
            channel.slack_workspaces.bot_token,
            message.user_id
          );
          userName = userInfo?.real_name || userInfo?.name || message.user_id;
        } catch (e) {
          console.warn('Could not fetch user info:', e);
        }
      }

      // Create the content idea
      const ideaData: Omit<ContentIdeaDB, 'id' | 'created_at' | 'updated_at' | 'used_count'> = {
        source: 'slack' as const,
        title: parsedIdea.title,
        description: parsedIdea.description,
        category: parsedIdea.category || 'General',
        priority: parsedIdea.priority,
        status: channel.auto_approve ? 'ready' : 'draft',
        client_id: channel.client_id,
        user_id: channel.user_id,
        slack_message_id: message.id,
        slack_channel_id: channel.id,
        slack_user_name: userName || 'Unknown',
        hashtags: parsedIdea.tags,
        notes: `Source: Slack channel #${channel.channel_name}`,
        original_message_url: this.generateSlackMessageUrl(
          channel.slack_workspaces?.workspace_id,
          channel.channel_id,
          message.message_id
        )
      };

      const idea = await contentIdeasService.create(ideaData);
      
      if (idea) {
        console.log(`💡 Created idea "${idea.title}" from Slack message`);
      }

      return idea;
    } catch (error) {
      console.error('Error creating idea from message:', error);
      throw error;
    }
  }

  // Parse message text to extract idea components
  private parseMessage(text: string): ParsedIdea | null {
    // Skip very short messages
    if (!text || text.trim().length < 10) {
      return null;
    }

    // Check for structured format (e.g., "Title: ...\nDescription: ...")
    const structuredMatch = text.match(/^(?:title|idea):\s*(.+?)(?:\n|$)(?:description|details)?:?\s*(.+)?/i);
    if (structuredMatch) {
      return {
        title: structuredMatch[1].trim(),
        description: structuredMatch[2]?.trim() || structuredMatch[1].trim(),
        priority: this.extractPriority(text),
        tags: this.extractHashtags(text),
        category: this.extractCategory(text)
      };
    }

    // Check for bullet points or numbered lists
    const listMatch = text.match(/^[\d\-\*•]\s+(.+)/);
    if (listMatch) {
      const title = listMatch[1].trim();
      return {
        title: this.truncateTitle(title),
        description: text,
        priority: this.extractPriority(text),
        tags: this.extractHashtags(text),
        category: this.extractCategory(text)
      };
    }

    // Default: Use first line as title, rest as description
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      return null;
    }

    const title = this.truncateTitle(lines[0]);
    const description = lines.length > 1 ? lines.join('\n') : lines[0];

    return {
      title,
      description,
      priority: this.extractPriority(text),
      tags: this.extractHashtags(text),
      category: this.extractCategory(text)
    };
  }

  // Extract priority from text or reactions
  private extractPriority(text: string): 'high' | 'medium' | 'low' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('high priority')) {
      return 'high';
    }
    if (lowerText.includes('low priority') || lowerText.includes('maybe') || lowerText.includes('someday')) {
      return 'low';
    }
    
    return 'medium';
  }

  // Extract hashtags from text
  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.substring(1));
  }

  // Extract category from text
  private extractCategory(text: string): string | undefined {
    const categories = [
      'Product', 'Marketing', 'Sales', 'Engineering', 'Design',
      'Customer Success', 'HR', 'Finance', 'Operations', 'Strategy'
    ];

    const lowerText = text.toLowerCase();
    for (const category of categories) {
      if (lowerText.includes(category.toLowerCase())) {
        return category;
      }
    }

    return undefined;
  }

  // Truncate title to reasonable length
  private truncateTitle(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  // Generate Slack message URL
  private generateSlackMessageUrl(
    workspaceId?: string,
    channelId?: string,
    messageTs?: string
  ): string | undefined {
    if (!workspaceId || !channelId || !messageTs) {
      return undefined;
    }

    // Convert timestamp to Slack's format (remove the dot)
    const ts = messageTs.replace('.', '');
    return `https://app.slack.com/client/${workspaceId}/${channelId}/thread/${channelId}-${ts}`;
  }

  // Sync all active channels (for morning automation)
  async syncAllActiveChannels(): Promise<{
    totalChannels: number;
    successfulSyncs: number;
    totalIdeasCreated: number;
    errors: string[];
  }> {
    const result = {
      totalChannels: 0,
      successfulSyncs: 0,
      totalIdeasCreated: 0,
      errors: [] as string[]
    };

    try {
      // Get all active channels
      const channels = await slackService.getActiveChannels();
      result.totalChannels = channels.length;

      console.log(`🔄 Starting sync for ${channels.length} active channels`);

      // Sync each channel
      for (const channel of channels) {
        try {
          const syncResult = await this.syncChannel(channel.id);
          
          if (syncResult.success) {
            result.successfulSyncs++;
            result.totalIdeasCreated += syncResult.ideasCreated;
          } else {
            result.errors.push(`Channel ${channel.channel_name}: ${syncResult.errors.join(', ')}`);
          }

          // Small delay between channels to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error(`Error syncing channel ${channel.channel_name}:`, error);
          result.errors.push(`Channel ${channel.channel_name}: ${error.message}`);
        }
      }

      console.log(`✅ Sync completed: ${result.successfulSyncs}/${result.totalChannels} channels, ${result.totalIdeasCreated} ideas created`);
    } catch (error: any) {
      console.error('Error in syncAllActiveChannels:', error);
      result.errors.push(`Global error: ${error.message}`);
    }

    return result;
  }

  // Process unprocessed messages (cleanup task)
  async processUnprocessedMessages(): Promise<{
    processed: number;
    ideasCreated: number;
  }> {
    const result = { processed: 0, ideasCreated: 0 };

    try {
      const messages = await slackService.getUnprocessedMessages();
      console.log(`📋 Found ${messages.length} unprocessed messages`);

      for (const message of messages) {
        try {
          // Get channel info
          const { data: channel } = await supabase
            .from('slack_channels')
            .select('*, slack_workspaces(*)')
            .eq('id', message.channel_id)
            .single();

          if (channel) {
            const idea = await this.processMessageToIdea(message, channel);
            if (idea) {
              result.ideasCreated++;
            }
          }
          
          result.processed++;
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
        }
      }

      console.log(`✅ Processed ${result.processed} messages, created ${result.ideasCreated} ideas`);
    } catch (error) {
      console.error('Error processing unprocessed messages:', error);
    }

    return result;
  }
}

export const slackSyncService = new SlackSyncService();