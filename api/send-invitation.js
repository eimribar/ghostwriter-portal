// =====================================================
// SEND INVITATION API
// Sends invitation emails to new clients
// =====================================================

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId, email, name, mobilePin } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Construct the invitation email
    const portalUrl = process.env.NODE_ENV === 'production' 
      ? 'https://unified-linkedin-project.vercel.app'
      : 'http://localhost:8080';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .pin-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
            .pin { font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #667eea; }
            .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Ghostwriter Portal!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              
              <p>You've been invited to access your personalized content portal where you can:</p>
              
              <ul>
                <li>Review and approve AI-generated LinkedIn content</li>
                <li>Provide feedback and request revisions</li>
                <li>Track your content calendar</li>
                <li>Access content from any device</li>
              </ul>
              
              <p><strong>To get started:</strong></p>
              
              <ol>
                <li>Click the button below to access your portal</li>
                <li>Sign in with this email address: <strong>${email}</strong></li>
                <li>Create a password for your account</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="${portalUrl}" class="button">Access Your Portal</a>
              </div>
              
              ${mobilePin ? `
              <div class="pin-box">
                <p><strong>Mobile App Access PIN:</strong></p>
                <div class="pin">${mobilePin}</div>
                <p style="font-size: 12px; color: #666;">Save this PIN for mobile app access</p>
              </div>
              ` : ''}
              
              <p>If you have any questions or need assistance, feel free to reply to this email.</p>
              
              <p>Best regards,<br>The Ghostwriter Team</p>
              
              <div class="footer">
                <p>This invitation was sent to ${email}</p>
                <p>© 2025 Ghostwriter Portal. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'Ghostwriter Portal <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to Ghostwriter Portal - Your Invitation',
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      return res.status(500).json({ error: 'Failed to send invitation email' });
    }

    console.log('Invitation email sent successfully:', data);
    return res.status(200).json({ 
      success: true, 
      message: 'Invitation sent successfully',
      emailId: data?.id 
    });

  } catch (error) {
    console.error('Error in send-invitation handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}