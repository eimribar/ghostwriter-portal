// Email notification service using Resend
import { Resend } from 'resend';

// Get configuration from environment variables
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@ghostwriter.com';

// Initialize Resend client
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface SearchCompletionEmail {
  searchQuery: string;
  resultCount: number;
  topIdeas: Array<{
    title: string;
    description: string;
    score: number;
  }>;
  searchDuration: string;
  jobId: string;
}

export const emailService = {
  isConfigured(): boolean {
    return !!(RESEND_API_KEY && ADMIN_EMAIL);
  },

  async sendSearchCompletionEmail(data: SearchCompletionEmail): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Email service not configured. Add VITE_RESEND_API_KEY and VITE_ADMIN_EMAIL to .env.local');
      return;
    }

    if (!resend) {
      console.error('Resend client not initialized');
      return;
    }

    const topIdeasHtml = data.topIdeas
      .map((idea, index) => `
        <li style="margin-bottom: 12px;">
          <strong>${index + 1}. ${idea.title}</strong> (Score: ${idea.score}/10)<br/>
          <span style="color: #666;">${idea.description}</span>
        </li>
      `)
      .join('');

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
            .stats { display: flex; gap: 20px; margin: 20px 0; }
            .stat { flex: 1; background: white; padding: 15px; border-radius: 8px; text-align: center; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✨ Your Content Ideas Are Ready!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">GPT-5 search completed successfully</p>
            </div>
            <div class="content">
              <p><strong>Search Query:</strong> "${data.searchQuery}"</p>
              
              <div class="stats">
                <div class="stat">
                  <div style="font-size: 24px; font-weight: bold; color: #667eea;">${data.resultCount}</div>
                  <div style="font-size: 12px; color: #666;">Ideas Generated</div>
                </div>
                <div class="stat">
                  <div style="font-size: 24px; font-weight: bold; color: #667eea;">${data.topIdeas[0]?.score || 0}/10</div>
                  <div style="font-size: 12px; color: #666;">Top Score</div>
                </div>
                <div class="stat">
                  <div style="font-size: 24px; font-weight: bold; color: #667eea;">${data.searchDuration}</div>
                  <div style="font-size: 12px; color: #666;">Search Time</div>
                </div>
              </div>

              <h3>Top ${Math.min(3, data.topIdeas.length)} Ideas:</h3>
              <ol style="padding-left: 20px;">
                ${topIdeasHtml}
              </ol>

              <div style="text-align: center;">
                <a href="https://ghostwriter-portal.vercel.app/ideation" class="button" style="color: white;">
                  View All Results →
                </a>
              </div>

              <div class="footer">
                <p>Job ID: ${data.jobId}</p>
                <p>This is an automated notification from your Ghostwriter Portal.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const response = await resend.emails.send({
        from: 'Ghostwriter Portal <onboarding@resend.dev>', // Use resend's verified domain for now
        to: [ADMIN_EMAIL],
        subject: `✨ Your Content Ideas Are Ready! (${data.resultCount} ideas found)`,
        html: emailHtml,
      });

      console.log('📧 Email sent successfully:', response);
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  },

  async sendSearchFailureEmail(searchQuery: string, errorMessage: string, jobId: string): Promise<void> {
    if (!this.isConfigured() || !resend) {
      return;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f56565 0%, #ed8936 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .error-box { background: #fff5f5; border: 1px solid #feb2b2; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⚠️ Search Failed</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">There was an issue with your content search</p>
            </div>
            <div class="content">
              <p><strong>Search Query:</strong> "${searchQuery}"</p>
              
              <div class="error-box">
                <strong>Error:</strong> ${errorMessage}
              </div>

              <p>Please try again or contact support if the issue persists.</p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
                <p>Job ID: ${jobId}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await resend.emails.send({
        from: 'Ghostwriter Portal <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `⚠️ Search Failed: "${searchQuery}"`,
        html: emailHtml,
      });
    } catch (error) {
      console.error('Failed to send error email:', error);
    }
  }
};

export default emailService;