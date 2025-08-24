// =====================================================
// EMAIL INVITATION SERVICE
// Professional email templates for client invitations
// Production-ready with Resend API integration
// =====================================================

import { supabase } from '../lib/supabase';

export interface InvitationEmailData {
  clientName: string;
  clientEmail: string;
  companyName: string;
  invitationToken: string;
  adminName?: string;
  customMessage?: string;
}

export const emailInvitationService = {
  /**
   * Generate the invitation email HTML template
   */
  generateInvitationTemplate(data: InvitationEmailData): string {
    const invitationUrl = `https://unified-linkedin-project.vercel.app/auth?invitation=${data.invitationToken}`;
    const adminName = data.adminName || 'Your LinkedIn Content Team';
    
    // SIMPLIFIED VERSION - Testing if large HTML is the issue
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome to Your LinkedIn Content Portal</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
        <h1 style="color: #333;">Welcome ${data.clientName}!</h1>
        
        <p>You've been invited to access your LinkedIn content management portal for <strong>${data.companyName}</strong>.</p>
        
        ${data.customMessage ? `
        <div style="background: #fffbf0; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <strong>Message from ${adminName}:</strong><br>
            ${data.customMessage}
        </div>
        ` : ''}
        
        <p>Click the button below to complete your account setup:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="display: inline-block; padding: 12px 30px; background: #18181b; color: white; text-decoration: none; border-radius: 5px;">
                Complete Account Setup
            </a>
        </div>
        
        <p style="font-size: 12px; color: #666;">
            Or copy this link: ${invitationUrl}
        </p>
        
        <p style="font-size: 12px; color: #666; margin-top: 30px;">
            This invitation expires in 7 days. If you have questions, please contact ${adminName}.
        </p>
    </div>
</body>
</html>`;
  },

  /**
   * Generate plain text version of the invitation email
   */
  generateInvitationTextTemplate(data: InvitationEmailData): string {
    const invitationUrl = `https://unified-linkedin-project.vercel.app/auth?invitation=${data.invitationToken}`;
    const adminName = data.adminName || 'Your LinkedIn Content Team';
    
    // SIMPLIFIED VERSION
    return `Welcome ${data.clientName}!

You've been invited to access your LinkedIn content portal for ${data.companyName}.

${data.customMessage ? `Message from ${adminName}: ${data.customMessage}\n\n` : ''}

Click here to complete your account setup:
${invitationUrl}

This invitation expires in 7 days.

If you have questions, please contact ${adminName}.

Best regards,
${data.companyName}`;
  },

  /**
   * Create and send invitation to client
   */
  async createAndSendInvitation(
    clientId: string,
    customMessage?: string,
    adminName?: string
  ): Promise<{ success: boolean; invitationId?: string; error?: string; emailFailed?: boolean; invitationToken?: string }> {
    try {
      console.log('📧 Creating invitation for client:', clientId);
      
      // Get client details
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        console.error('Client not found:', clientError);
        return { success: false, error: 'Client not found' };
      }

      // Call database function to create invitation
      const { data: invitationData, error: inviteError } = await supabase
        .rpc('send_client_invitation', {
          p_client_id: clientId,
          p_admin_id: null // Will be set by the function if needed
        });

      if (inviteError) {
        console.error('Database error creating invitation:', inviteError);
        // Extract the actual error message from the database
        const errorMessage = inviteError.message || inviteError.details || 'Failed to create invitation record';
        return { success: false, error: `Database error: ${errorMessage}` };
      }

      if (!invitationData || invitationData.length === 0) {
        console.error('No invitation data returned from database');
        return { success: false, error: 'No invitation data returned from database function' };
      }

      const invitation = invitationData[0];
      console.log('✅ Invitation created:', invitation);

      // Prepare email data
      const emailData: InvitationEmailData = {
        clientName: client.name,
        clientEmail: client.email,
        companyName: client.company,
        invitationToken: invitation.token,
        adminName,
        customMessage
      };

      // Send email via Vercel function
      try {
        const apiUrl = import.meta.env.PROD 
          ? 'https://ghostwriter-portal.vercel.app/api/send-invitation'
          : '/api/send-invitation';

        console.log('📧 Attempting to send email via:', apiUrl);
        console.log('Environment:', import.meta.env.PROD ? 'PRODUCTION' : 'DEVELOPMENT');
        console.log('Full URL:', apiUrl);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: client.email,
            subject: `You're Invited: Access Your LinkedIn Content Portal`,
            html: this.generateInvitationTemplate(emailData),
            text: this.generateInvitationTextTemplate(emailData),
            clientName: client.name,
            invitationId: invitation.invitation_id
          }),
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Could not parse error response' }));
          console.error('❌ Email API call failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          
          // Don't throw - return partial success with invitation details
          return { 
            success: false,
            emailFailed: true,
            invitationId: invitation.invitation_id,
            invitationToken: invitation.token,
            error: `Email delivery failed (${response.status}) but invitation created. You can share the link manually.`
          };
        }

        const result = await response.json();
        console.log('✅ Email API response:', result);

        return { 
          success: true, 
          invitationId: invitation.invitation_id 
        };
        
      } catch (emailError) {
        console.error('❌ Network error calling email API:', emailError);
        // Return partial success - invitation created but email failed
        return { 
          success: false,
          emailFailed: true,
          invitationId: invitation.invitation_id,
          invitationToken: invitation.token,
          error: `Email delivery failed but invitation created. You can share the link manually.`
        };
      }
      
    } catch (err) {
      console.error('Error in createAndSendInvitation:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Resend invitation email for existing invitation
   */
  async resendInvitationEmail(
    invitationId: string,
    customMessage?: string,
    adminName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get invitation details
      const { data: invitation, error } = await supabase
        .from('client_invitations')
        .select(`
          *,
          clients!inner (
            name,
            email,
            company
          )
        `)
        .eq('id', invitationId)
        .single();

      if (error || !invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      const emailData: InvitationEmailData = {
        clientName: invitation.clients.name,
        clientEmail: invitation.clients.email,
        companyName: invitation.clients.company,
        invitationToken: invitation.token,
        adminName,
        customMessage
      };

      // Send email
      const apiUrl = import.meta.env.PROD 
        ? 'https://ghostwriter-portal.vercel.app/api/send-invitation'
        : '/api/send-invitation';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: invitation.clients.email,
          subject: `Reminder: Access Your LinkedIn Content Portal`,
          html: this.generateInvitationTemplate(emailData),
          text: this.generateInvitationTextTemplate(emailData),
          clientName: invitation.clients.name,
          invitationId: invitation.id,
          isResend: true
        }),
      });

      if (!response.ok) {
        return { success: false, error: 'Failed to send email' };
      }

      return { success: true };
      
    } catch (err) {
      console.error('Error resending invitation:', err);
      return { success: false, error: 'Failed to resend invitation' };
    }
  }
};