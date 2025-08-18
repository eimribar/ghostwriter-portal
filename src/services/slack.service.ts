// Slack API Service
// Handles all interactions with Slack API

import { supabase } from '../lib/supabase';

export interface SlackWorkspace {
  id: string;
  workspace_name: string;
  workspace_id: string;
  bot_token: string;
  bot_user_id: string;
  app_id: string;
  is_active: boolean;
  last_sync_at?: Date;
}

export interface SlackChannel {
  id: string;
  workspace_id: string;
  channel_id: string;
  channel_name: string;
  channel_type: string;
  client_id?: string;
  user_id?: string;
  is_active: boolean;
  sync_enabled: boolean;
  sync_frequency: 'daily' | 'hourly' | 'realtime';
  last_sync_at?: Date;
  last_message_timestamp?: string;
  auto_approve: boolean;
}

export interface SlackMessage {
  id?: string;
  channel_id: string;
  message_id: string;
  user_id: string;
  user_name?: string;
  message_text: string;
  message_type: 'message' | 'thread_reply' | 'file_share';
  thread_ts?: string;
  has_attachments: boolean;
  attachments?: any;
  reactions?: any;
  is_processed: boolean;
  converted_to_idea: boolean;
  idea_id?: string;
  slack_timestamp: Date;
}

export interface SlackApiMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  attachments?: any[];
  reactions?: any[];
}

class SlackService {
  private baseUrl = 'https://slack.com/api';

  // Fetch messages from a Slack channel
  async fetchChannelMessages(
    botToken: string,
    channelId: string,
    oldest?: string,
    limit: number = 100
  ): Promise<SlackApiMessage[]> {
    try {
      const params = new URLSearchParams({
        channel: channelId,
        limit: limit.toString(),
        ...(oldest && { oldest })
      });

      const response = await fetch(`${this.baseUrl}/conversations.history?${params}`, {
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

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

  // Get channel info
  async getChannelInfo(botToken: string, channelId: string): Promise<any> {
    try {
      const params = new URLSearchParams({ channel: channelId });

      const response = await fetch(`${this.baseUrl}/conversations.info?${params}`, {
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return data.channel;
    } catch (error) {
      console.error('Error fetching channel info:', error);
      throw error;
    }
  }

  // Post a message to Slack
  async postMessage(
    botToken: string,
    channelId: string,
    text: string,
    threadTs?: string
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: channelId,
          text,
          ...(threadTs && { thread_ts: threadTs })
        })
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error('Error posting Slack message:', error);
      throw error;
    }
  }

  // List all channels in workspace
  async listChannels(botToken: string, types: string = 'public_channel,private_channel'): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        types,
        exclude_archived: 'true',
        limit: '1000'
      });

      const response = await fetch(`${this.baseUrl}/conversations.list?${params}`, {
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return data.channels || [];
    } catch (error) {
      console.error('Error listing Slack channels:', error);
      throw error;
    }
  }

  // Get user info
  async getUserInfo(botToken: string, userId: string): Promise<any> {
    try {
      const params = new URLSearchParams({ user: userId });

      const response = await fetch(`${this.baseUrl}/users.info?${params}`, {
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return data.user;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  // Database operations
  async getActiveWorkspaces(): Promise<SlackWorkspace[]> {
    const { data, error } = await supabase
      .from('slack_workspaces')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching active workspaces:', error);
      return [];
    }

    return data || [];
  }

  async getActiveChannels(workspaceId?: string): Promise<SlackChannel[]> {
    let query = supabase
      .from('slack_channels')
      .select('*')
      .eq('is_active', true)
      .eq('sync_enabled', true);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching active channels:', error);
      return [];
    }

    return data || [];
  }

  async saveWorkspace(workspace: Omit<SlackWorkspace, 'id'>): Promise<SlackWorkspace | null> {
    const { data, error } = await supabase
      .from('slack_workspaces')
      .upsert([workspace], { onConflict: 'workspace_id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving workspace:', error);
      return null;
    }

    return data;
  }

  async saveChannel(channel: Omit<SlackChannel, 'id'>): Promise<SlackChannel | null> {
    const { data, error } = await supabase
      .from('slack_channels')
      .upsert([channel], { onConflict: 'workspace_id,channel_id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving channel:', error);
      return null;
    }

    return data;
  }

  async saveMessages(messages: Omit<SlackMessage, 'id'>[]): Promise<SlackMessage[]> {
    const { data, error } = await supabase
      .from('slack_messages')
      .upsert(messages, { onConflict: 'channel_id,message_id' })
      .select();

    if (error) {
      console.error('Error saving messages:', error);
      return [];
    }

    return data || [];
  }

  async updateChannelLastSync(channelId: string, lastMessageTimestamp: string): Promise<void> {
    const { error } = await supabase
      .from('slack_channels')
      .update({
        last_sync_at: new Date(),
        last_message_timestamp: lastMessageTimestamp
      })
      .eq('id', channelId);

    if (error) {
      console.error('Error updating channel last sync:', error);
    }
  }

  async getUnprocessedMessages(channelId?: string): Promise<SlackMessage[]> {
    let query = supabase
      .from('slack_messages')
      .select('*')
      .eq('is_processed', false)
      .eq('converted_to_idea', false)
      .order('slack_timestamp', { ascending: true });

    if (channelId) {
      query = query.eq('channel_id', channelId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching unprocessed messages:', error);
      return [];
    }

    return data || [];
  }

  async markMessageProcessed(messageId: string, ideaId?: string): Promise<void> {
    const update: any = {
      is_processed: true,
      converted_to_idea: !!ideaId
    };

    if (ideaId) {
      update.idea_id = ideaId;
    }

    const { error } = await supabase
      .from('slack_messages')
      .update(update)
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as processed:', error);
    }
  }

  // Verify Slack request signature (for webhooks)
  verifySlackSignature(
    signature: string,
    timestamp: string,
    body: string,
    signingSecret: string
  ): boolean {
    const crypto = require('crypto');
    
    // Check if timestamp is not too old (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
      return false;
    }

    // Create the signature base string
    const signatureBaseString = `v0:${timestamp}:${body}`;
    
    // Create HMAC with SHA256
    const hmac = crypto.createHmac('sha256', signingSecret);
    hmac.update(signatureBaseString);
    const computedSignature = `v0=${hmac.digest('hex')}`;
    
    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  }
}

export const slackService = new SlackService();