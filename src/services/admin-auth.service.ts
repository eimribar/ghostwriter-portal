// =====================================================
// ADMIN AUTHENTICATION SERVICE
// Handles admin impersonation and control system
// Production-ready with audit logging
// =====================================================

import { supabase } from '../lib/supabase';

export interface ImpersonationSession {
  token: string;
  client_id: string;
  client_email: string;
  client_name: string;
  admin_email: string;
  expires_at: string;
}

export interface ClientAuthOverview {
  client_id: string;
  client_name: string;
  client_email: string;
  client_company: string;
  auth_status: 'not_invited' | 'invitation_sent' | 'invitation_accepted' | 'active' | 'suspended';
  auth_provider: string | null;
  last_login_at: string | null;
  failed_login_attempts: number;
  is_locked: boolean;
  invitation_sent_at: string | null;
  invitation_expires_at: string | null;
  has_active_impersonation: boolean;
}

export const adminAuthService = {
  /**
   * Get overview of all clients' authentication status
   */
  async getClientAuthOverview(): Promise<ClientAuthOverview[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_client_auth_overview');

      if (error) {
        console.error('Error fetching client auth overview:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error:', err);
      return [];
    }
  },

  /**
   * Create impersonation session for a client
   */
  async createImpersonationToken(
    clientId: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; session?: ImpersonationSession; error?: string }> {
    try {
      console.log('🔐 Creating impersonation token for client:', clientId);
      
      const { data, error } = await supabase
        .rpc('create_impersonation_token', {
          p_admin_email: 'eimrib@yess.ai', // Hardcoded for now, will be dynamic later
          p_client_id: clientId,
          p_reason: reason || 'Admin debugging session',
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        });

      if (error) {
        console.error('Error creating impersonation token:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Failed to create impersonation token' };
      }

      const tokenData = data[0];
      console.log('✅ Impersonation token created:', tokenData);

      // Validate the token to get client details
      const validation = await this.validateImpersonationToken(tokenData.token);
      if (!validation.success || !validation.session) {
        return { success: false, error: 'Failed to validate created token' };
      }

      return {
        success: true,
        session: validation.session
      };
    } catch (err) {
      console.error('Error creating impersonation token:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Validate impersonation token
   */
  async validateImpersonationToken(token: string): Promise<{ success: boolean; session?: ImpersonationSession; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('validate_impersonation_token', {
          p_token: token
        });

      if (error) {
        console.error('Error validating impersonation token:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Invalid or expired impersonation token' };
      }

      const sessionData = data[0];
      
      const session: ImpersonationSession = {
        token,
        client_id: sessionData.client_id,
        client_email: sessionData.client_email,
        client_name: sessionData.client_name,
        admin_email: sessionData.admin_email,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
      };

      return { success: true, session };
    } catch (err) {
      console.error('Error validating impersonation token:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * End impersonation session
   */
  async endImpersonationSession(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('end_impersonation_session', {
          p_token: token
        });

      if (error) {
        console.error('Error ending impersonation session:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Session not found or already ended' };
      }

      return { success: true };
    } catch (err) {
      console.error('Error ending impersonation session:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },


  /**
   * Clean up expired impersonation sessions
   */
  async cleanupExpiredSessions(): Promise<{ success: boolean; cleanedCount?: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_impersonation_sessions');

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
        return { success: false, error: error.message };
      }

      return { success: true, cleanedCount: data || 0 };
    } catch (err) {
      console.error('Error cleaning up expired sessions:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Get client's authentication audit log
   */
  async getClientAuditLog(clientId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('auth_audit_log')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching audit log:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error:', err);
      return [];
    }
  },

  /**
   * Update client auth status
   */
  async updateClientAuthStatus(
    clientId: string, 
    status: 'not_invited' | 'invitation_sent' | 'invitation_accepted' | 'active' | 'suspended',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ 
          auth_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      if (error) {
        console.error('Error updating client auth status:', error);
        return { success: false, error: error.message };
      }

      // Log the status change
      await supabase.rpc('log_auth_event', {
        p_client_id: clientId,
        p_admin_email: 'eimrib@yess.ai',
        p_event_type: status === 'suspended' ? 'account_suspended' : 'account_reactivated',
        p_event_details: { reason, previous_status: status }
      });

      return { success: true };
    } catch (err) {
      console.error('Error updating client auth status:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Send password reset for client
   */
  async sendClientPasswordReset(clientEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(clientEmail, {
        redirectTo: 'https://www.agentss.app/reset-password'
      });

      if (error) {
        console.error('Error sending password reset:', error);
        return { success: false, error: error.message };
      }

      // Log the password reset request
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('email', clientEmail)
        .single();

      if (client) {
        await supabase.rpc('log_auth_event', {
          p_client_id: client.id,
          p_admin_email: 'eimrib@yess.ai',
          p_event_type: 'password_reset',
          p_event_details: { triggered_by: 'admin' }
        });
      }

      return { success: true };
    } catch (err) {
      console.error('Error sending password reset:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Check if current session is an impersonation
   */
  async getCurrentImpersonationSession(): Promise<ImpersonationSession | null> {
    try {
      // Check if there's an impersonation token in localStorage or URL
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('impersonation') || localStorage.getItem('admin_impersonation_token');
      
      if (!token) {
        return null;
      }

      const validation = await this.validateImpersonationToken(token);
      if (!validation.success || !validation.session) {
        // Clean up invalid token
        localStorage.removeItem('admin_impersonation_token');
        return null;
      }

      // Store valid token for future use
      localStorage.setItem('admin_impersonation_token', token);
      
      return validation.session;
    } catch (err) {
      console.error('Error checking impersonation session:', err);
      return null;
    }
  },

  /**
   * End current impersonation and return to admin portal
   */
  async exitImpersonation(): Promise<void> {
    try {
      const token = localStorage.getItem('admin_impersonation_token');
      if (token) {
        await this.endImpersonationSession(token);
        localStorage.removeItem('admin_impersonation_token');
      }
      
      // Redirect to admin portal
      window.location.href = 'https://ghostwriter-portal.vercel.app';
    } catch (err) {
      console.error('Error exiting impersonation:', err);
      // Force redirect even if ending session failed
      window.location.href = 'https://ghostwriter-portal.vercel.app';
    }
  },

  /**
   * Generate client portal URL with impersonation token
   */
  generateImpersonationUrl(token: string): string {
    // Use production URL for client portal with impersonation token
    return `https://www.agentss.app/client-approve?impersonation=${token}`;
  }
};