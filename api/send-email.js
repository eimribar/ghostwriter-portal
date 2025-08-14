// Simple API endpoint to send email notifications
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId, searchQuery, resultCount, topIdeas, duration } = req.body;

    const resendKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    if (!resendKey) {
      console.error('Missing RESEND_API_KEY');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    
    const adminEmail = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'eimrib@yess.ai';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .stat { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✨ Your Content Ideas Are Ready!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Background search completed successfully</p>
            </div>
            <div class="content">
              <p><strong>Search Query:</strong> ${searchQuery || 'B2B SaaS, AI & Marketing News'}</p>
              
              <div class="stat">
                <strong>${resultCount || 10}</strong> ideas generated in <strong>${duration || '2-5 minutes'}</strong>
              </div>

              ${topIdeas && topIdeas.length > 0 ? `
                <h3>Top Ideas:</h3>
                <ol>
                  ${topIdeas.map((idea, i) => `
                    <li style="margin-bottom: 15px;">
                      <strong>${idea.title}</strong> (Score: ${idea.score}/10)<br/>
                      <span style="color: #666;">${idea.description}</span>
                    </li>
                  `).join('')}
                </ol>
              ` : ''}

              <div style="text-align: center;">
                <a href="https://ghostwriter-portal.vercel.app/ideation" class="button" style="color: white;">
                  View All Results →
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                <p>Job ID: ${jobId || 'N/A'}</p>
                <p>This is an automated notification from your Ghostwriter Portal.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: 'Ghostwriter Portal <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `✨ Your Content Ideas Are Ready! (${resultCount || 10} ideas found)`,
      html: emailHtml
    });

    console.log('Email sent successfully:', emailResponse);
    
    return res.status(200).json({ 
      success: true, 
      emailId: emailResponse.id,
      sentTo: adminEmail
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Failed to send email notification'
    });
  }
}