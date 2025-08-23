// =====================================================
// ADMIN CLIENT AUTHENTICATION MANAGEMENT
// Complete visibility and control over client credentials
// Production-ready impersonation system
// =====================================================

import { useState, useEffect } from 'react';
import { 
  Shield, Users, LogIn, UserCheck, Clock, AlertTriangle, 
  RefreshCw, Send, Key, Eye, History,
  CheckCircle, XCircle, Pause, Play
} from 'lucide-react';
import { cn } from '../lib/utils';
import { adminAuthService, type ClientAuthOverview } from '../services/admin-auth.service';
import { clientInvitationService } from '../services/client-invitation.service';
import toast from 'react-hot-toast';

const AdminClientAuth = () => {
  const [clients, setClients] = useState<ClientAuthOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientAuthOverview | null>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const clientsData = await adminAuthService.getClientAuthOverview();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'suspended':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'invitation_sent':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'invitation_accepted':
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      case 'not_invited':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'suspended':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'invitation_sent':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'invitation_accepted':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'not_invited':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  const handleImpersonate = async (client: ClientAuthOverview) => {
    if (impersonating) {
      toast.error('Already impersonating another client');
      return;
    }

    if (client.auth_status !== 'active') {
      toast.error('Can only impersonate active clients');
      return;
    }

    setImpersonating(client.client_id);
    toast.loading('Creating impersonation session...', { id: 'impersonate' });

    try {
      const result = await adminAuthService.createImpersonationToken(
        client.client_id,
        'Admin debugging session via AdminClientAuth page',
        undefined,
        navigator.userAgent
      );

      if (result.success && result.session) {
        const impersonationUrl = adminAuthService.generateImpersonationUrl(result.session.token);
        
        // Open client portal in new tab with impersonation token
        window.open(impersonationUrl, '_blank');
        
        toast.success('Impersonation session created! Opening client portal...', { id: 'impersonate' });
        
        // Refresh client data to show active impersonation
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

  const handleSendInvitation = async (client: ClientAuthOverview) => {
    toast.loading('Sending invitation...', { id: 'invite' });

    try {
      const result = await clientInvitationService.sendInvitation(client.client_id);
      
      if (result.success) {
        toast.success('Invitation sent successfully!', { id: 'invite' });
        await loadClients();
      } else {
        throw new Error(result.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(`Invitation failed: ${error}`, { id: 'invite' });
    }
  };

  const handleUpdateStatus = async (client: ClientAuthOverview, newStatus: any) => {
    try {
      const result = await adminAuthService.updateClientAuthStatus(
        client.client_id,
        newStatus,
        `Status changed from ${client.auth_status} to ${newStatus} via admin portal`
      );

      if (result.success) {
        toast.success(`Client status updated to ${newStatus}`);
        await loadClients();
      } else {
        throw new Error(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(`Status update failed: ${error}`);
    }
  };

  const handlePasswordReset = async (client: ClientAuthOverview) => {
    if (!confirm(`Send password reset email to ${client.client_email}?`)) {
      return;
    }

    try {
      const result = await adminAuthService.sendClientPasswordReset(client.client_email);
      
      if (result.success) {
        toast.success('Password reset email sent!');
      } else {
        throw new Error(result.error || 'Failed to send password reset');
      }
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error(`Password reset failed: ${error}`);
    }
  };

  const viewAuditLog = async (client: ClientAuthOverview) => {
    setSelectedClient(client);
    try {
      const log = await adminAuthService.getClientAuditLog(client.client_id);
      setAuditLog(log);
    } catch (error) {
      console.error('Error loading audit log:', error);
      toast.error('Failed to load audit log');
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = searchTerm === '' || 
      client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.client_company.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || client.auth_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.auth_status === 'active').length,
    pending: clients.filter(c => c.auth_status === 'invitation_sent').length,
    suspended: clients.filter(c => c.auth_status === 'suspended').length,
    impersonations: clients.filter(c => c.has_active_impersonation).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500">Loading client authentication data...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Client Authentication</h1>
            <p className="text-zinc-500 mt-1">Complete visibility and control over client credentials</p>
          </div>
        </div>
        <button
          onClick={loadClients}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-zinc-400">Total Clients</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-zinc-400">Active</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">{stats.active}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-zinc-400">Pending</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-zinc-400">Suspended</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">{stats.suspended}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-zinc-400">Active Impersonations</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">{stats.impersonations}</div>
        </div>
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
          {(['all', 'active', 'pending', 'suspended'] as const).map(status => (
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

      {/* Client Table */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-400 mb-2">No clients found</h3>
          <p className="text-zinc-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'No clients have been set up yet'}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-950 border-b border-zinc-800">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Client</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Provider</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Last Login</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Security</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.client_id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-zinc-100">{client.client_name}</div>
                        <div className="text-sm text-zinc-500">{client.client_email}</div>
                        <div className="text-xs text-zinc-600">{client.client_company}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border',
                        getStatusColor(client.auth_status)
                      )}>
                        {getStatusIcon(client.auth_status)}
                        {client.auth_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-zinc-300">
                        {client.auth_provider || 'Not set'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-zinc-300">
                        {client.last_login_at 
                          ? new Date(client.last_login_at).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                      {client.is_locked && (
                        <div className="text-xs text-red-400">🔒 Locked</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {client.has_active_impersonation && (
                          <div className="text-xs text-purple-400">👁️ Impersonated</div>
                        )}
                        {client.failed_login_attempts > 0 && (
                          <div className="text-xs text-yellow-400">
                            {client.failed_login_attempts} failed attempts
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {client.auth_status === 'active' && (
                          <button
                            onClick={() => handleImpersonate(client)}
                            disabled={!!impersonating || client.has_active_impersonation}
                            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Login as this client"
                          >
                            <LogIn className="w-4 h-4" />
                          </button>
                        )}
                        
                        {client.auth_status === 'not_invited' && (
                          <button
                            onClick={() => handleSendInvitation(client)}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Send invitation"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {client.auth_status === 'active' && (
                          <>
                            <button
                              onClick={() => handlePasswordReset(client)}
                              className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                              title="Send password reset"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleUpdateStatus(client, 'suspended')}
                              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              title="Suspend client"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {client.auth_status === 'suspended' && (
                          <button
                            onClick={() => handleUpdateStatus(client, 'active')}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            title="Reactivate client"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => viewAuditLog(client)}
                          className="p-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors"
                          title="View audit log"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="border-b border-zinc-800 p-6">
              <h3 className="text-xl font-semibold text-zinc-100">Audit Log</h3>
              <p className="text-zinc-500 mt-1">{selectedClient.client_name} ({selectedClient.client_email})</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {auditLog.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No audit entries found</div>
              ) : (
                <div className="space-y-3">
                  {auditLog.map((entry, index) => (
                    <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-zinc-100">{entry.event_type.replace('_', ' ')}</span>
                        <span className="text-sm text-zinc-500">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      {entry.admin_email && (
                        <div className="text-sm text-blue-400 mb-1">Admin: {entry.admin_email}</div>
                      )}
                      {entry.event_details && (
                        <div className="text-sm text-zinc-400">
                          {JSON.stringify(entry.event_details, null, 2)}
                        </div>
                      )}
                      {entry.ip_address && (
                        <div className="text-xs text-zinc-600 mt-1">IP: {entry.ip_address}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800 p-6 flex justify-end">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClientAuth;