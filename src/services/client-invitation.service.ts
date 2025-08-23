// =====================================================
// CLIENT INVITATION SERVICE
// Handles SSO invitation flow for new clients
// Used by admin portal to invite clients
// =====================================================

import { supabase } from '../lib/supabase';
import { emailInvitationService } from './email-invitation.service';
import toast from 'react-hot-toast';

export interface ClientInvitation {
  id: string;
  client_id: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  sent_at: string;
  expires_at: string;
  accepted_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const clientInvitationService = {
  /**
   * Send invitation to a client for SSO signup with professional email
   */
  async sendInvitation(clientId: string, customMessage?: string): Promise<{ success: boolean; invitation?: ClientInvitation; error?: string; emailFailed?: boolean; invitationToken?: string }> {
    try {
      console.log('📧 Sending SSO invitation for client:', clientId);
      
      // Use the professional email invitation service
      const result = await emailInvitationService.createAndSendInvitation(
        clientId,
        customMessage,
        'Your LinkedIn Content Team'
      );

      // Check if invitation was created (even if email failed)
      if (result.invitationId) {
        // Get invitation details for return
        const invitation = await this.getClientInvitation(clientId);
        
        // If we have a token from the result or the invitation, use it
        const token = result.invitationToken || invitation?.token || '';
        
        if (result.emailFailed) {
          // Invitation created but email failed
          console.log('⚠️ Invitation created but email failed:', result.error);
          return {
            success: false,
            emailFailed: true,
            invitationToken: token,
            invitation: invitation || {
              id: result.invitationId,
              client_id: clientId,
              email: '',
              token: token,
              status: 'pending',
              sent_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            error: result.error
          };
        }
        
        // Full success
        console.log('✅ Professional invitation email sent:', result);
        return { 
          success: true,
          invitationToken: token,
          invitation: invitation || {
            id: result.invitationId,
            client_id: clientId,
            email: '',
            token: token,
            status: 'pending',
            sent_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };
      }

      // Complete failure - no invitation created
      console.error('Failed to create invitation:', result.error);
      return { success: false, error: result.error || 'Failed to create invitation' };
      
    } catch (err) {
      console.error('Error sending invitation:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Get invitation status for a client
   */
  async getClientInvitation(clientId: string): Promise<ClientInvitation | null> {
    try {
      const { data, error } = await supabase
        .from('client_invitations')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No invitation found
          return null;
        }
        console.error('Error fetching invitation:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  },

  /**
   * Resend invitation to a client
   */
  async resendInvitation(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Cancel existing invitation
      await this.cancelInvitation(clientId);
      
      // Send new invitation
      const result = await this.sendInvitation(clientId);
      return { success: result.success, error: result.error };
    } catch (err) {
      console.error('Error resending invitation:', err);
      return { success: false, error: 'Failed to resend invitation' };
    }
  },

  /**
   * Cancel invitation for a client
   */
  async cancelInvitation(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('client_invitations')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error cancelling invitation:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Error:', err);
      return { success: false, error: 'Failed to cancel invitation' };
    }
  },

  /**
   * Get all invitations with client details
   */
  async getAllInvitations(): Promise<(ClientInvitation & { client_name?: string; client_email?: string })[]> {
    try {
      const { data, error } = await supabase
        .from('client_invitations')
        .select(`
          *,
          clients!inner (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all invitations:', error);
        return [];
      }

      return data.map((invitation: any) => ({
        ...invitation,
        client_name: invitation.clients.name,
        client_email: invitation.clients.email
      }));
    } catch (err) {
      console.error('Error:', err);
      return [];
    }
  },

  /**
   * Generate invitation URL for sharing
   */
  generateInvitationUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || window.location.origin;
    return `${base}/auth?invitation=${token}`;
  },

  /**
   * Copy invitation URL to clipboard
   */
  async copyInvitationUrl(token: string): Promise<void> {
    try {
      const url = this.generateInvitationUrl(token);
      await navigator.clipboard.writeText(url);
      toast.success('Invitation link copied to clipboard!');
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      toast.error('Failed to copy invitation link');
    }
  }
};