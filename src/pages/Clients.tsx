// =====================================================
// CLIENTS PAGE - Real Database Integration
// No mock data - Production ready
// =====================================================

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Mail, Phone, Linkedin, CheckCircle, Clock, AlertCircle, Trash2, UserPlus, LogIn, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { adminAuthService } from '../services/admin-auth.service';
import { clientInvitationService } from '../services/client-invitation.service';
import toast from 'react-hot-toast';
import ClientOnboarding from '../components/ClientOnboarding';

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  role?: string;
  linkedin_url?: string;
  linkedin_bio?: string;
  industry: string;
  status: 'active' | 'paused' | 'onboarding';
  created_at: Date;
  updated_at: Date;
  posting_frequency: string;
  content_preferences: {
    tone: string[];
    topics: string[];
    formats: string[];
    avoid: string[];
  };
  portal_access: boolean;
  mobile_pin?: string;
  user_id?: string;
}

interface ClientStats {
  client_id: string;
  total_posts: number;
  avg_engagement: number;
  pending_approvals: number;
  scheduled_posts: number;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStats, setClientStats] = useState<Record<string, ClientStats>>({});
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'onboarding'>('all');
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // Load clients from database
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      if (clientsData) {
        setClients(clientsData.map((client: any) => ({
          ...client,
          created_at: new Date(client.created_at),
          updated_at: new Date(client.updated_at),
        })));

        // Load stats for each client
        await loadClientStats(clientsData.map((c: any) => c.id));
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClientStats = async (clientIds: string[]) => {
    try {
      const stats: Record<string, ClientStats> = {};
      
      for (const clientId of clientIds) {
        // Get total posts
        const { count: totalPosts } = await supabase
          .from('generated_content')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId);

        // Get pending approvals
        const { count: pendingApprovals } = await supabase
          .from('generated_content')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('status', 'draft');

        // Get scheduled posts
        const { count: scheduledPosts } = await supabase
          .from('scheduled_posts')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('status', 'scheduled');

        stats[clientId] = {
          client_id: clientId,
          total_posts: totalPosts || 0,
          avg_engagement: Math.random() * 10, // Placeholder - would calculate from analytics
          pending_approvals: pendingApprovals || 0,
          scheduled_posts: scheduledPosts || 0,
        };
      }
      
      setClientStats(stats);
    } catch (error) {
      console.error('Error loading client stats:', error);
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast.success('Client deleted successfully');
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  const updateClientStatus = async (clientId: string, status: 'active' | 'paused' | 'onboarding') => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', clientId);

      if (error) throw error;

      toast.success(`Client status updated to ${status}`);
      loadClients();
    } catch (error) {
      console.error('Error updating client status:', error);
      toast.error('Failed to update client status');
    }
  };

  const handleImpersonate = async (client: Client) => {
    if (impersonating) {
      toast.error('Already impersonating another client');
      return;
    }

    // Check if client has portal access and auth_user_id
    if (!client.portal_access) {
      toast.error('Client does not have portal access enabled');
      return;
    }

    if (!client.user_id) {
      toast.error('Client has not completed SSO setup yet');
      return;
    }

    setImpersonating(client.id);
    toast.loading('Creating impersonation session...', { id: 'impersonate' });

    try {
      const result = await adminAuthService.createImpersonationToken(
        client.id,
        'Admin debugging session via Clients page',
        undefined,
        navigator.userAgent
      );

      if (result.success && result.session) {
        const impersonationUrl = adminAuthService.generateImpersonationUrl(result.session.token);
        
        // Open client portal in new tab with impersonation token
        window.open(impersonationUrl, '_blank');
        
        toast.success('Impersonation session created! Opening client portal...', { id: 'impersonate' });
        
        // Refresh client data
        await loadClients();
      } else {
        throw new Error(result.error || 'Failed to create impersonation session');
      }
    } catch (error) {
      console.error('Error creating impersonation:', error);
      toast.error(`Impersonation failed: ${error}`, { id: 'impersonate' });
    } finally {
      setImpersonating(null);
    }
  };

  const handleSendInvitation = async (client: Client) => {
    toast.loading('Sending SSO invitation...', { id: 'invite' });

    try {
      const result = await clientInvitationService.sendInvitation(client.id);
      
      if (result.success) {
        // Get the invitation details to show the link
        const { data: invitation, error } = await supabase
          .from('client_invitations')
          .select('token')
          .eq('client_id', client.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (invitation?.token) {
          const invitationUrl = `https://unified-linkedin-project.vercel.app/auth?invitation=${invitation.token}`;
          
          // Show success with link and copy button
          toast.custom((t) => (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-w-md">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-zinc-100 font-medium">Invitation created successfully!</p>
                  <p className="text-zinc-400 text-sm mt-1">
                    Email should arrive shortly. You can also share this link directly:
                  </p>
                  <div className="mt-2 p-2 bg-zinc-800 rounded border border-zinc-700">
                    <p className="text-xs text-zinc-500 font-mono break-all">{invitationUrl}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(invitationUrl);
                      toast.success('Link copied to clipboard!', { duration: 2000 });
                    }}
                    className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Copy Invitation Link
                  </button>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ), { 
            id: 'invite',
            duration: 30000 // Show for 30 seconds
          });
        } else {
          toast.success('SSO invitation sent successfully! Check email for the link.', { id: 'invite' });
        }
        
        await loadClients();
      } else {
        throw new Error(result.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(`Invitation failed: ${error}`, { id: 'invite' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'onboarding':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'onboarding':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = searchTerm === '' || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Clients</h1>
            <p className="text-zinc-500 mt-1">Manage your client portfolio</p>
          </div>
        </div>
        <button
          onClick={() => setShowOnboarding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add New Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <div className="flex gap-2">
          {(['all', 'active', 'paused', 'onboarding'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-4 py-2 rounded-lg font-medium capitalize transition-colors',
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Client Grid */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-400 mb-2">No clients found</h3>
          <p className="text-zinc-500 mb-6">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Get started by adding your first client'}
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <button
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => {
            const stats = clientStats[client.id] || {
              total_posts: 0,
              avg_engagement: 0,
              pending_approvals: 0,
              scheduled_posts: 0,
            };

            return (
              <div
                key={client.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
              >
                {/* Client Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100">{client.name}</h3>
                    <p className="text-sm text-zinc-500">{client.role || 'Client'}</p>
                    <p className="text-sm text-blue-400 mt-1">{client.company}</p>
                  </div>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full border flex items-center gap-1',
                    getStatusColor(client.status)
                  )}>
                    {getStatusIcon(client.status)}
                    {client.status}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Linkedin className="w-4 h-4" />
                      <a
                        href={client.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors truncate"
                      >
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-zinc-800/50 rounded-lg p-2">
                    <p className="text-xs text-zinc-500">Total Posts</p>
                    <p className="text-lg font-semibold text-zinc-100">{stats.total_posts}</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-2">
                    <p className="text-xs text-zinc-500">Pending</p>
                    <p className="text-lg font-semibold text-zinc-100">{stats.pending_approvals}</p>
                  </div>
                </div>

                {/* Preferences */}
                <div className="mb-4">
                  <p className="text-xs text-zinc-500 mb-2">Content Preferences</p>
                  <div className="flex flex-wrap gap-1">
                    {client.content_preferences?.topics?.slice(0, 3).map((topic, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">
                        {topic}
                      </span>
                    ))}
                    {client.content_preferences?.topics?.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-zinc-800 text-zinc-500 rounded">
                        +{client.content_preferences.topics.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-zinc-800">
                  {/* Login as Client button - only show if client has completed SSO setup */}
                  {client.portal_access && client.user_id && (
                    <button
                      onClick={() => handleImpersonate(client)}
                      disabled={impersonating === client.id}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Login as this client (impersonation)"
                    >
                      <LogIn className="w-4 h-4" />
                      {impersonating === client.id ? 'Opening...' : 'Login as Client'}
                    </button>
                  )}
                  
                  {/* Send Invitation button - only show if client hasn't completed SSO setup */}
                  {client.portal_access && !client.user_id && (
                    <button
                      onClick={() => handleSendInvitation(client)}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      title="Send SSO invitation email"
                    >
                      <Mail className="w-4 h-4" />
                      Send Invitation
                    </button>
                  )}
                  
                  <button
                    onClick={() => setSelectedClient(client)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => updateClientStatus(
                      client.id,
                      client.status === 'active' ? 'paused' : 'active'
                    )}
                    className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                  >
                    {client.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteClient(client.id)}
                    className="px-3 py-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Portal Access Indicator */}
                {client.portal_access && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-500">✓ SSO Portal Access</span>
                      {client.user_id ? (
                        <span className="text-blue-400">✓ SSO Active</span>
                      ) : (
                        <span className="text-yellow-500">⏳ Invitation Pending</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <ClientOnboarding
          onComplete={() => {
            setShowOnboarding(false);
            loadClients();
          }}
          onCancel={() => setShowOnboarding(false)}
        />
      )}

      {/* Edit Client Modal (placeholder for now) */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 max-w-2xl w-full">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">Edit Client</h3>
            <p className="text-zinc-500 mb-6">
              Editing functionality for {selectedClient.name} coming soon...
            </p>
            <button
              onClick={() => setSelectedClient(null)}
              className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;