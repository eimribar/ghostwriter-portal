// =====================================================
// CLIENT INVITATION MODAL
// Send SSO invitations to clients
// Modern UI with invitation tracking
// =====================================================

import React, { useState, useEffect } from 'react';
import { X, Mail, Copy, ExternalLink, CheckCircle, Clock, AlertCircle, Send, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { clientInvitationService, type ClientInvitation } from '../services/client-invitation.service';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  invitation_status?: 'pending' | 'accepted' | 'expired';
}

interface ClientInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onInvitationSent: () => void;
}

const ClientInvitationModal: React.FC<ClientInvitationModalProps> = ({
  isOpen,
  onClose,
  client,
  onInvitationSent
}) => {
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<ClientInvitation | null>(null);
  const [invitationUrl, setInvitationUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && client) {
      loadInvitation();
    }
  }, [isOpen, client]);

  const loadInvitation = async () => {
    if (!client) return;
    
    try {
      const existingInvitation = await clientInvitationService.getClientInvitation(client.id);
      setInvitation(existingInvitation);
      
      if (existingInvitation) {
        const url = clientInvitationService.generateInvitationUrl(existingInvitation.token);
        setInvitationUrl(url);
      }
    } catch (err) {
      console.error('Error loading invitation:', err);
    }
  };

  const handleSendInvitation = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      const result = await clientInvitationService.sendInvitation(client.id);
      
      if (result.success && result.invitation) {
        setInvitation(result.invitation);
        const url = clientInvitationService.generateInvitationUrl(result.invitation.token);
        setInvitationUrl(url);
        
        toast.success('Invitation sent successfully!');
        onInvitationSent();
      } else {
        toast.error(result.error || 'Failed to send invitation');
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      toast.error('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      const result = await clientInvitationService.resendInvitation(client.id);
      
      if (result.success) {
        await loadInvitation(); // Reload invitation data
        toast.success('Invitation resent successfully!');
        onInvitationSent();
      } else {
        toast.error(result.error || 'Failed to resend invitation');
      }
    } catch (err) {
      console.error('Error resending invitation:', err);
      toast.error('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    if (invitation) {
      clientInvitationService.copyInvitationUrl(invitation.token);
    }
  };

  const getInvitationStatusIcon = () => {
    if (!invitation) return null;
    
    switch (invitation.status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Mail className="w-5 h-5 text-zinc-500" />;
    }
  };

  const getInvitationStatusText = () => {
    if (!invitation) return 'No invitation sent';
    
    switch (invitation.status) {
      case 'pending':
        return 'Invitation pending';
      case 'accepted':
        return 'Invitation accepted';
      case 'expired':
        return 'Invitation expired';
      case 'cancelled':
        return 'Invitation cancelled';
      default:
        return 'Unknown status';
    }
  };

  const isExpired = invitation && new Date(invitation.expires_at) < new Date();

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-zinc-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">Client Invitation</h2>
              <p className="text-sm text-zinc-600 mt-1">
                Send SSO invitation to {client.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Client Info */}
          <div className="mb-6 p-4 bg-zinc-50 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-zinc-200 rounded-xl flex items-center justify-center">
                <span className="text-zinc-700 font-semibold text-lg">
                  {client.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900">{client.name}</h3>
                <p className="text-sm text-zinc-600">{client.company}</p>
                <p className="text-sm text-zinc-600 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" />
                  {client.email}
                </p>
              </div>
            </div>
          </div>

          {/* Invitation Status */}
          {invitation ? (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                {getInvitationStatusIcon()}
                <div>
                  <p className="font-medium text-zinc-900">{getInvitationStatusText()}</p>
                  <p className="text-sm text-zinc-600">
                    Sent {new Date(invitation.sent_at).toLocaleDateString()} at{' '}
                    {new Date(invitation.sent_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {invitation.status === 'pending' && (
                <div className="mb-4">
                  {isExpired ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          This invitation has expired. Send a new one to allow the client to sign up.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Invitation expires on {new Date(invitation.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {invitation.status === 'accepted' && (
                <div className="mb-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Client has successfully signed up and can access their portal.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Invitation URL */}
              {invitationUrl && invitation.status !== 'accepted' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Invitation Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={invitationUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                      title="Copy invitation link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={invitationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Open invitation link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Mail className="w-5 h-5" />
                <span className="font-medium">No invitation sent yet</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Send an invitation to allow this client to create their account and access the portal.
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="mb-6 p-4 bg-zinc-50 rounded-lg">
            <h4 className="font-medium text-zinc-900 mb-2">How it works:</h4>
            <ul className="space-y-1 text-sm text-zinc-600">
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">1.</span>
                <span>Send an invitation link to the client's email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">2.</span>
                <span>Client clicks the link and creates their account with SSO</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">3.</span>
                <span>Client can immediately access their personalized content portal</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-white transition-colors"
            >
              Close
            </button>
            
            {invitation?.status === 'accepted' ? (
              <div className="text-sm text-green-600 font-medium">
                ✅ Client has access to portal
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {invitation && (invitation.status === 'pending' && !isExpired) && (
                  <button
                    onClick={handleResendInvitation}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-zinc-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Resend
                  </button>
                )}
                
                <button
                  onClick={invitation ? handleResendInvitation : handleSendInvitation}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50",
                    invitation ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  )}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {invitation ? 'Send New Invitation' : 'Send Invitation'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientInvitationModal;