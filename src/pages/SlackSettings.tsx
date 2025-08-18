import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, RefreshCw, Check, X, Loader2, AlertCircle, Hash, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface SlackWorkspace {
  id: string;
  workspace_name: string;
  workspace_id: string;
  bot_token: string;
  bot_user_id: string;
  app_id: string;
  is_active: boolean;
  last_sync_at?: Date;
}

interface SlackChannel {
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

const SlackSettings = () => {
  const [workspaces, setWorkspaces] = useState<SlackWorkspace[]>([]);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddWorkspace, setShowAddWorkspace] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  
  const [newWorkspace, setNewWorkspace] = useState({
    workspace_name: '',
    workspace_id: '',
    bot_token: '',
    app_id: ''
  });
  
  const [newChannel, setNewChannel] = useState({
    workspace_id: '',
    channel_id: '',
    channel_name: '',
    sync_frequency: 'daily' as 'daily' | 'hourly' | 'realtime',
    auto_approve: false
  });

  useEffect(() => {
    loadWorkspacesAndChannels();
  }, []);

  const loadWorkspacesAndChannels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load workspaces
      const { data: workspacesData, error: wsError } = await supabase
        .from('slack_workspaces')
        .select('*')
        .order('workspace_name');
      
      if (wsError) throw wsError;
      setWorkspaces(workspacesData || []);
      
      // Load channels
      const { data: channelsData, error: chError } = await supabase
        .from('slack_channels')
        .select('*')
        .order('channel_name');
      
      if (chError) throw chError;
      setChannels(channelsData || []);
      
    } catch (err: any) {
      console.error('Error loading Slack settings:', err);
      setError('Failed to load Slack settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorkspace = async () => {
    if (!newWorkspace.workspace_name || !newWorkspace.bot_token) {
      setError('Workspace name and bot token are required');
      return;
    }
    
    try {
      // Determine API URL based on environment
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:5173/api/slack-verify-token'
        : '/api/slack-verify-token';
      
      console.log('🔐 Verifying bot token via API...');
      
      // Test the bot token via our backend API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bot_token: newWorkspace.bot_token
        })
      });
      
      const data = await response.json();
      console.log('📊 Verification response:', data);
      
      if (!data.ok) {
        // Provide detailed error message
        const errorMessage = data.details || data.error || 'Invalid bot token';
        throw new Error(errorMessage);
      }
      
      // Save workspace with verified info
      const { data: workspace, error } = await supabase
        .from('slack_workspaces')
        .insert([{
          workspace_name: newWorkspace.workspace_name,
          workspace_id: data.team_id || newWorkspace.workspace_id,
          bot_token: newWorkspace.bot_token,
          bot_user_id: data.user_id,
          app_id: newWorkspace.app_id || data.bot_id,
          is_active: true
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to save workspace: ${error.message}`);
      }
      
      console.log('✅ Workspace added successfully:', workspace);
      setWorkspaces([...workspaces, workspace]);
      setShowAddWorkspace(false);
      setNewWorkspace({
        workspace_name: '',
        workspace_id: '',
        bot_token: '',
        app_id: ''
      });
      setError(null); // Clear any previous errors
      
    } catch (err: any) {
      console.error('❌ Error adding workspace:', err);
      setError(err.message || 'Failed to add workspace. Please check your bot token.');
    }
  };

  const handleAddChannel = async () => {
    if (!newChannel.workspace_id || !newChannel.channel_id || !newChannel.channel_name) {
      setError('All fields are required');
      return;
    }
    
    try {
      const workspace = workspaces.find(ws => ws.id === newChannel.workspace_id);
      if (!workspace) throw new Error('Workspace not found');
      
      // Skip Slack verification to avoid CORS issues
      // The channel will be verified during the first sync
      console.log('📢 Adding channel without verification (will verify on first sync)');
      
      // Determine channel type based on ID prefix
      // C = public channel, G = private group, D = direct message
      const channelType = newChannel.channel_id.startsWith('C') ? 'public' : 
                         newChannel.channel_id.startsWith('G') ? 'private' : 
                         newChannel.channel_id.startsWith('D') ? 'dm' : 'public';
      
      // Save channel
      const { data: channel, error } = await supabase
        .from('slack_channels')
        .insert([{
          workspace_id: newChannel.workspace_id,
          channel_id: newChannel.channel_id,
          channel_name: newChannel.channel_name,
          channel_type: channelType,
          is_active: true,
          sync_enabled: true,
          sync_frequency: newChannel.sync_frequency,
          auto_approve: newChannel.auto_approve
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to save channel: ${error.message}`);
      }
      
      console.log('✅ Channel added successfully:', channel);
      setChannels([...channels, channel]);
      setShowAddChannel(false);
      setNewChannel({
        workspace_id: '',
        channel_id: '',
        channel_name: '',
        sync_frequency: 'daily',
        auto_approve: false
      });
      setError(null); // Clear any previous errors
      
    } catch (err: any) {
      console.error('❌ Error adding channel:', err);
      setError(err.message || 'Failed to add channel. Please check the channel ID.');
    }
  };

  const handleSyncChannel = async (channelId: string) => {
    setSyncing(channelId);
    setError(null);
    
    try {
      // Determine API URL based on environment
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:5173/api/slack-sync'
        : '/api/slack-sync';
      
      console.log('🔄 Starting sync via API...');
      
      // Call our backend API to sync the channel
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channelId: channelId
        })
      });
      
      const result = await response.json();
      console.log('📊 Sync response:', result);
      
      if (!result.success) {
        // Provide detailed error message
        let errorMessage = result.error || result.details || 'Sync failed';
        
        // Check for specific error types
        if (result.details === 'not_in_channel' || errorMessage.includes('not in channel')) {
          errorMessage = result.error; // Use the detailed instructions from backend
        }
        
        throw new Error(errorMessage);
      }
      
      // Reload channels to show updated sync time
      await loadWorkspacesAndChannels();
      
      // Show success message
      console.log(`✅ Sync successful: ${result.ideasCreated} ideas created from ${result.messagesProcessed} messages`);
      
      // Optionally show a success notification (you can remove this if you don't want it)
      if (result.ideasCreated > 0) {
        setError(null); // Clear any errors
        // You could set a success message here if you add a success state
      }
      
    } catch (err: any) {
      console.error('❌ Error syncing channel:', err);
      setError(err.message || 'Failed to sync channel. Please check your configuration.');
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleChannel = async (channelId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('slack_channels')
        .update({ sync_enabled: enabled })
        .eq('id', channelId);
      
      if (error) throw error;
      
      setChannels(channels.map(ch => 
        ch.id === channelId ? { ...ch, sync_enabled: enabled } : ch
      ));
    } catch (err: any) {
      console.error('Error toggling channel:', err);
      setError('Failed to update channel');
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to remove this channel?')) return;
    
    try {
      const { error } = await supabase
        .from('slack_channels')
        .delete()
        .eq('id', channelId);
      
      if (error) throw error;
      
      setChannels(channels.filter(ch => ch.id !== channelId));
    } catch (err: any) {
      console.error('Error deleting channel:', err);
      setError('Failed to delete channel');
    }
  };

  const getWorkspaceName = (workspaceId: string) => {
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    return workspace?.workspace_name || 'Unknown Workspace';
  };

  const getSyncFrequencyColor = (frequency: string) => {
    switch(frequency) {
      case 'realtime': return 'text-green-600 bg-green-50';
      case 'hourly': return 'text-blue-600 bg-blue-50';
      case 'daily': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-zinc-50 p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Slack Integration</h1>
            <p className="text-zinc-600 mt-1">Manage Slack workspaces and channels for content ideation</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddWorkspace(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Workspace
            </button>
            <button
              onClick={() => setShowAddChannel(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              disabled={workspaces.length === 0}
            >
              <Hash className="h-4 w-4" />
              Add Channel
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Workspaces</p>
                <p className="text-2xl font-bold text-zinc-900">{workspaces.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Active Channels</p>
                <p className="text-2xl font-bold text-green-600">
                  {channels.filter(ch => ch.sync_enabled).length}
                </p>
              </div>
              <Hash className="h-8 w-8 text-green-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Real-time Sync</p>
                <p className="text-2xl font-bold text-blue-600">
                  {channels.filter(ch => ch.sync_frequency === 'realtime').length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Auto-Approve</p>
                <p className="text-2xl font-bold text-purple-600">
                  {channels.filter(ch => ch.auto_approve).length}
                </p>
              </div>
              <Check className="h-8 w-8 text-purple-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Channels List */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-4 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">Connected Channels</h2>
        </div>
        
        {channels.length === 0 ? (
          <div className="p-8 text-center">
            <Hash className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">No channels connected</h3>
            <p className="text-zinc-600 mb-4">
              Add a Slack workspace first, then connect channels to start capturing ideas
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {channels.map(channel => (
              <div key={channel.id} className="p-4 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Hash className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900">#{channel.channel_name}</h3>
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getSyncFrequencyColor(channel.sync_frequency))}>
                          {channel.sync_frequency.toUpperCase()}
                        </span>
                        {channel.auto_approve && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600">
                            AUTO-APPROVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500">
                        {getWorkspaceName(channel.workspace_id)} · 
                        {channel.last_sync_at 
                          ? ` Last synced ${new Date(channel.last_sync_at).toLocaleString()}`
                          : ' Never synced'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSyncChannel(channel.id)}
                      className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                      disabled={syncing === channel.id}
                      title="Sync now"
                    >
                      {syncing === channel.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleToggleChannel(channel.id, !channel.sync_enabled)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        channel.sync_enabled
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-50"
                      )}
                      title={channel.sync_enabled ? "Disable sync" : "Enable sync"}
                    >
                      {channel.sync_enabled ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteChannel(channel.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove channel"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Workspace Modal */}
      {showAddWorkspace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Add Slack Workspace</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={newWorkspace.workspace_name}
                  onChange={(e) => setNewWorkspace({...newWorkspace, workspace_name: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="e.g., My Company"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Bot Token</label>
                <input
                  type="password"
                  value={newWorkspace.bot_token}
                  onChange={(e) => setNewWorkspace({...newWorkspace, bot_token: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="xoxb-..."
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Get this from your Slack app's OAuth & Permissions page
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">App ID (Optional)</label>
                <input
                  type="text"
                  value={newWorkspace.app_id}
                  onChange={(e) => setNewWorkspace({...newWorkspace, app_id: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="A1234567890"
                />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <strong>Required Slack OAuth Scopes:</strong><br />
                  • channels:history<br />
                  • channels:read<br />
                  • chat:write<br />
                  • users:read
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddWorkspace(false);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWorkspace}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Add Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Channel Modal */}
      {showAddChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Add Slack Channel</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Workspace</label>
                <select
                  value={newChannel.workspace_id}
                  onChange={(e) => setNewChannel({...newChannel, workspace_id: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="">Select workspace...</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.workspace_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Channel ID</label>
                <input
                  type="text"
                  value={newChannel.channel_id}
                  onChange={(e) => setNewChannel({...newChannel, channel_id: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="C1234567890"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Right-click channel in Slack → View channel details → ID at bottom
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Channel Name</label>
                <input
                  type="text"
                  value={newChannel.channel_name}
                  onChange={(e) => setNewChannel({...newChannel, channel_name: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="general"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Sync Frequency</label>
                <select
                  value={newChannel.sync_frequency}
                  onChange={(e) => setNewChannel({...newChannel, sync_frequency: e.target.value as any})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="daily">Daily</option>
                  <option value="hourly">Hourly</option>
                  <option value="realtime">Real-time</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_approve"
                  checked={newChannel.auto_approve}
                  onChange={(e) => setNewChannel({...newChannel, auto_approve: e.target.checked})}
                  className="rounded border-zinc-300"
                />
                <label htmlFor="auto_approve" className="text-sm text-zinc-700">
                  Auto-approve ideas from this channel
                </label>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddChannel(false);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddChannel}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Add Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlackSettings;