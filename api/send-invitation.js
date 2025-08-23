// =====================================================
// SEND INVITATION EMAIL - Vercel Serverless Function
// Sends professional SSO invitation emails via Resend
// =====================================================

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      to, 
      subject, 
      html, 
      text, 
      clientName, 
      invitationId,
      isResend = false 
    } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, html' 
      });
    }

    console.log(`📧 Sending ${isResend ? 'resent ' : ''}invitation email to:`, to);
    console.log('Client:', clientName);
    console.log('Invitation ID:', invitationId);

    // Send email using Resend
    const email = await resend.emails.send({
      from: 'LinkedIn Content Portal <noreply@updates.yess.ai>',
      to: [to],
      subject,
      html,
      text: text || stripHtml(html), // Fallback to stripped HTML if no text provided
      tags: [
        { name: 'type', value: 'invitation' },
        { name: 'client', value: clientName || 'unknown' },
        { name: 'invitation_id', value: invitationId || 'unknown' },
        { name: 'is_resend', value: String(isResend) }
      ]
    });

    console.log('✅ Invitation email sent successfully:', email);

    return res.status(200).json({ 
      success: true, 
      messageId: email.id,
      message: `Invitation email sent to ${to}`
    });

  } catch (error) {
    console.error('❌ Error sending invitation email:', error);

    // Check if it's a Resend API error
    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: error.response.data?.message || 'Email service error',
        details: error.response.data
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'Failed to send invitation email',
      details: error.message
    });
  }
}

// Helper function to strip HTML tags for plain text version
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gs, '') // Remove style tags
    .replace(/<script[^>]*>.*?<\/script>/gs, '') // Remove script tags
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}