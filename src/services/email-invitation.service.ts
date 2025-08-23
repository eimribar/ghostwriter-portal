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
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Your LinkedIn Content Portal</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 20px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
        }
        .content {
            padding: 40px 30px;
        }
        h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        h2 {
            color: #18181b;
            font-size: 22px;
            margin-bottom: 10px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #374151;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
            color: white !important;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
        }
        .button:hover {
            background: linear-gradient(135deg, #27272a 0%, #3f3f46 100%);
        }
        .benefits {
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .benefit-item {
            display: flex;
            align-items: start;
            margin-bottom: 15px;
        }
        .benefit-icon {
            color: #10b981;
            margin-right: 12px;
            font-size: 20px;
        }
        .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .link-url {
            word-break: break-all;
            color: #3b82f6;
            font-size: 12px;
            margin-top: 10px;
        }
        .custom-message {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .security-note {
            background: #e0e7ff;
            border: 1px solid #a5b4fc;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 14px;
            color: #4f46e5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚀</div>
            <h1>Welcome to Your LinkedIn Content Portal</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello ${data.clientName},
            </div>
            
            <p>
                You've been invited to access your personalized LinkedIn content management portal 
                for <strong>${data.companyName}</strong>. This secure portal will allow you to review, 
                approve, and manage all your LinkedIn content in one place.
            </p>
            
            ${data.customMessage ? `
            <div class="custom-message">
                <strong>Message from ${adminName}:</strong><br>
                ${data.customMessage}
            </div>
            ` : ''}
            
            <div class="benefits">
                <h2>What you'll be able to do:</h2>
                <div class="benefit-item">
                    <span class="benefit-icon">✅</span>
                    <div>
                        <strong>Review Content</strong><br>
                        Approve or request changes to LinkedIn posts before they go live
                    </div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">📊</span>
                    <div>
                        <strong>Track Performance</strong><br>
                        Monitor engagement metrics and content performance
                    </div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">🗓️</span>
                    <div>
                        <strong>Schedule Posts</strong><br>
                        Plan your content calendar and maintain consistent presence
                    </div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">💡</span>
                    <div>
                        <strong>Share Ideas</strong><br>
                        Collaborate with your content team on new topics
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" class="button">
                    Complete Your Account Setup →
                </a>
                <div class="link-url">
                    Can't click the button? Copy this link:<br>
                    ${invitationUrl}
                </div>
            </div>
            
            <div class="security-note">
                <strong>🔒 Security Note:</strong> This invitation link is unique to you and will expire 
                in 7 days. You can sign in with Google, GitHub, or create a secure password.
            </div>
            
            <h2>Getting Started is Easy:</h2>
            <ol style="color: #4b5563; line-height: 1.8;">
                <li>Click the button above to access your portal</li>
                <li>Choose your preferred sign-in method (Google, GitHub, or Email)</li>
                <li>Complete your account setup</li>
                <li>Start reviewing and approving your content!</li>
            </ol>
            
            <p style="margin-top: 30px; color: #6b7280;">
                If you have any questions or need assistance, please don't hesitate to reach out to 
                ${adminName} or reply to this email.
            </p>
        </div>
        
        <div class="footer">
            <p>
                <strong>${data.companyName}</strong><br>
                Powered by LinkedIn Content Management System
            </p>
            <p style="margin-top: 15px; font-size: 12px;">
                This email was sent to ${data.clientEmail} because you were invited to join 
                the content management portal. If you believe this was sent in error, 
                please contact your administrator.
            </p>
            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                © 2025 LinkedIn Content Portal. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  },

  /**
   * Generate plain text version of the invitation email
   */
  generateInvitationTextTemplate(data: InvitationEmailData): string {
    const invitationUrl = `https://unified-linkedin-project.vercel.app/auth?invitation=${data.invitationToken}`;
    const adminName = data.adminName || 'Your LinkedIn Content Team';
    
    return `
Welcome to Your LinkedIn Content Portal

Hello ${data.clientName},

You've been invited to access your personalized LinkedIn content management portal for ${data.companyName}.

${data.customMessage ? `Message from ${adminName}:\n${data.customMessage}\n\n` : ''}

What you'll be able to do:
✅ Review Content - Approve or request changes to LinkedIn posts
📊 Track Performance - Monitor engagement metrics
🗓️ Schedule Posts - Plan your content calendar
💡 Share Ideas - Collaborate with your content team

Complete Your Account Setup:
${invitationUrl}

Getting Started:
1. Click the link above to access your portal
2. Choose your preferred sign-in method (Google, GitHub, or Email)
3. Complete your account setup
4. Start reviewing and approving your content!

This invitation link is unique to you and will expire in 7 days.

If you have any questions, please contact ${adminName}.

Best regards,
${data.companyName}
LinkedIn Content Management Team
    `;
  },

  /**
   * Create and send invitation to client
   */
  async createAndSendInvitation(
    clientId: string,
    customMessage?: string,
    adminName?: string
  ): Promise<{ success: boolean; invitationId?: string; error?: string }> {
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
        const apiUrl = process.env.NODE_ENV === 'production' 
          ? '/api/send-invitation'
          : 'http://localhost:3000/api/send-invitation';

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

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Email sending failed:', errorData);
          
          // Still return success if invitation was created (email can be resent)
          return { 
            success: true, 
            invitationId: invitation.invitation_id,
            error: 'Invitation created but email failed to send. You can resend it later.'
          };
        }

        const result = await response.json();
        console.log('✅ Invitation email sent successfully:', result);

        return { 
          success: true, 
          invitationId: invitation.invitation_id 
        };
        
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Still return success if invitation was created
        return { 
          success: true, 
          invitationId: invitation.invitation_id,
          error: 'Invitation created but email failed to send. You can resend it later.'
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
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/send-invitation'
        : 'http://localhost:3000/api/send-invitation';

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