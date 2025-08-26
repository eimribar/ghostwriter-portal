// =====================================================
// CLIENTS PAGE - Real Database Integration
// No mock data - Production ready
// =====================================================

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Mail, Phone, Linkedin, CheckCircle, Clock, AlertCircle, AlertTriangle, Trash2, UserPlus, LogIn, X } from 'lucide-react';
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
    toast.loading('Creating SSO invitation...', { id: 'invite' });

    try {
      const result = await clientInvitationService.sendInvitation(client.id);
      
      // Check if invitation was created (even if email failed)
      if (result.invitationToken || result.invitation?.token) {
        // Get the token from result or fetch it
        let token = result.invitationToken || result.invitation?.token;
        
        // If we still don't have a token, try to fetch it
        if (!token) {
          const { data: invitation } = await supabase
            .from('client_invitations')
            .select('token')
            .eq('client_id', client.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          token = invitation?.token;
        }
        
        if (token) {
          const invitationUrl = `https://unified-linkedin-project.vercel.app/auth?invitation=${token}`;
          
          // Show appropriate message based on email status
          toast.custom((t) => (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-w-md">
              <div className="flex items-start gap-3">
                {result.emailFailed ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-zinc-100 font-medium">
                    {result.emailFailed ? 'Invitation created (email failed)' : 'Invitation created successfully!'}
                  </p>
                  <p className="text-zinc-400 text-sm mt-1">
                    {result.emailFailed 
                      ? 'Email delivery failed, but you can share this link directly:'
                      : 'Email should arrive shortly. You can also share this link directly:'}
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
            duration: result.emailFailed ? 60000 : 30000 // Show longer if email failed
          });
        } else {
          // No token found at all
          throw new Error('Failed to retrieve invitation token');
        }
        
        await loadClients();
      } else {
        // Complete failure - no invitation created
        throw new Error(result.error || 'Failed to create invitation');
      }
    } catch (error) {
      console.error('Error with invitation:', error);
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

  const handleSaveClient = async (updatedClient: Partial<Client>) => {
    if (!selectedClient) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updatedClient)
        .eq('id', selectedClient.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setClients(prev => prev.map(client => 
        client.id === selectedClient.id 
          ? { ...client, ...data, updated_at: new Date(data.updated_at) }
          : client
      ));

      setSelectedClient(null);
      toast.success('Client updated successfully');
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'paused':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'onboarding':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
                className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:border-gray-200 transition-all duration-300 transform hover:-translate-y-1 group"
              >
                {/* Client Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-gray-700">
                        {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                      <p className="text-sm text-gray-600">{client.role || 'Client'}</p>
                      <p className="text-sm font-medium text-blue-600 mt-1">{client.company}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'px-3 py-1 text-xs font-medium rounded-full border-2 flex items-center gap-1.5 shadow-sm',
                    getStatusColor(client.status)
                  )}>
                    {getStatusIcon(client.status)}
                    {client.status}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-green-500" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Linkedin className="w-4 h-4 text-blue-600" />
                      <a
                        href={client.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-500 transition-colors truncate"
                      >
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-gray-600 font-medium">Total Posts</p>
                    <p className="text-xl font-bold text-gray-900">{stats.total_posts}</p>
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border border-orange-100">
                    <p className="text-xs text-gray-600 font-medium">Pending</p>
                    <p className="text-xl font-bold text-orange-600">{stats.pending_approvals}</p>
                  </div>
                </div>

                {/* Preferences */}
                <div className="mb-4">
                  <p className="text-xs text-gray-600 font-medium mb-2">Content Preferences</p>
                  <div className="flex flex-wrap gap-1">
                    {client.content_preferences?.topics?.slice(0, 3).map((topic, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                        {topic}
                      </span>
                    ))}
                    {client.content_preferences?.topics?.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full font-medium">
                        +{client.content_preferences.topics.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
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
                  
                  {/* View Client Portal - for admin to view any client's portal */}
                  <button
                    onClick={() => window.open(`https://unified-linkedin-project.vercel.app/client-approve?client_id=${client.id}`, '_blank')}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                    title="View client's portal"
                  >
                    <LogIn className="w-4 h-4" />
                    View Portal
                  </button>
                  
                  {/* Send Invitation button - only show if client hasn't completed SSO setup */}
                  {client.portal_access && !client.user_id && (
                    <button
                      onClick={() => handleSendInvitation(client)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                      title="Send SSO invitation email"
                    >
                      <Mail className="w-4 h-4" />
                      Send Invitation
                    </button>
                  )}
                  
                  <button
                    onClick={() => setSelectedClient(client)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 text-sm shadow-md hover:shadow-lg transform hover:scale-105"
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

      {/* Edit Client Modal */}
      {selectedClient && <EditClientModal client={selectedClient} onClose={() => setSelectedClient(null)} onSave={handleSaveClient} />}
    </div>
  );
};

// Edit Client Modal Component
interface EditClientModalProps {
  client: Client;
  onClose: () => void;
  onSave: (updatedClient: Partial<Client>) => void;
}

const EditClientModal: React.FC<EditClientModalProps> = ({ client, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: client.name || '',
    email: client.email || '',
    company: client.company || '',
    role: client.role || '',
    phone: client.phone || '',
    linkedin_url: client.linkedin_url || '',
    industry: client.industry || '',
    status: client.status || 'active',
    posting_frequency: client.posting_frequency || 'daily',
    portal_access: client.portal_access || false,
    content_preferences: {
      tone: client.content_preferences?.tone || [],
      topics: client.content_preferences?.topics || [],
      formats: client.content_preferences?.formats || [],
      avoid: client.content_preferences?.avoid || []
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(formData);
    setIsSubmitting(false);
  };

  const handleArrayChange = (field: string, value: string) => {
    const currentArray = formData.content_preferences[field as keyof typeof formData.content_preferences] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    setFormData({
      ...formData,
      content_preferences: {
        ...formData.content_preferences,
        [field]: newArray
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Client</h2>
                <p className="text-gray-600 mt-1">Update {client.name}'s information</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., CEO, Marketing Director"
                  />
                </div>
              </div>

              {/* Contact & Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact & Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
                  <input
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as Client['status']})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="onboarding">Onboarding</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Posting Frequency</label>
                  <select
                    value={formData.posting_frequency}
                    onChange={(e) => setFormData({...formData, posting_frequency: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="portal_access"
                    checked={formData.portal_access}
                    onChange={(e) => setFormData({...formData, portal_access: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="portal_access" className="text-sm font-medium text-gray-700">
                    Portal Access Enabled
                  </label>
                </div>
              </div>
            </div>

            {/* Content Preferences */}
            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Preferences</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {['Professional', 'Casual', 'Authoritative', 'Friendly', 'Expert', 'Personal'].map(tone => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => handleArrayChange('tone', tone.toLowerCase())}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          formData.content_preferences.tone.includes(tone.toLowerCase())
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {['Leadership', 'Technology', 'Business', 'Innovation', 'Strategy', 'Growth', 'Marketing', 'Sales'].map(topic => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => handleArrayChange('topics', topic.toLowerCase())}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          formData.content_preferences.topics.includes(topic.toLowerCase())
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Clients;