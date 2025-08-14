// API endpoint to check completed jobs and send email notifications
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const { Resend } = await import('resend');
    
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const resend = new Resend(process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY);
    const adminEmail = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'eimrib@yess.ai';

    // Find completed jobs without notifications sent
    const { data: jobs, error } = await supabase
      .from('search_jobs')
      .select('*')
      .eq('status', 'completed')
      .eq('notification_sent', false);

    if (error) {
      console.error('Error fetching jobs:', error);
      return res.status(500).json({ error: 'Failed to fetch jobs' });
    }

    const notifications = [];
    
    for (const job of jobs || []) {
      try {
        // Get the generated ideas for this job
        const { data: ideas } = await supabase
          .from('content_ideas')
          .select('*')
          .order('score', { ascending: false })
          .limit(3);

        const topIdeas = (ideas || []).map(idea => ({
          title: idea.title,
          description: idea.description,
          score: idea.score || 0
        }));

        const duration = job.processing_time_seconds 
          ? `${Math.floor(job.processing_time_seconds / 60)}m ${job.processing_time_seconds % 60}s`
          : '2-5 minutes';

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
                  <p><strong>Search:</strong> ${job.search_query}</p>
                  
                  <div class="stat">
                    <strong>${job.result_count || 10}</strong> ideas generated in <strong>${duration}</strong>
                  </div>

                  ${topIdeas.length > 0 ? `
                    <h3>Top Ideas:</h3>
                    <ol>
                      ${topIdeas.map((idea, i) => `
                        <li style="margin-bottom: 15px;">
                          <strong>${idea.title}</strong> (Score: ${idea.score}/10)<br/>
                          <span style="color: #666;">${idea.description}</span>
                        </li>
                      `).join('')}
                    </ol>
                  ` : '<p>Check the platform for your generated ideas.</p>'}

                  <div style="text-align: center;">
                    <a href="https://ghostwriter-portal.vercel.app/ideation" class="button" style="color: white;">
                      View All Results →
                    </a>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `;

        await resend.emails.send({
          from: 'Ghostwriter Portal <onboarding@resend.dev>',
          to: [adminEmail],
          subject: `✨ Your Content Ideas Are Ready! (${job.result_count || 10} ideas found)`,
          html: emailHtml
        });

        // Mark notification as sent
        await supabase
          .from('search_jobs')
          .update({ notification_sent: true })
          .eq('id', job.id);

        notifications.push({
          jobId: job.id,
          sentTo: adminEmail,
          ideaCount: job.result_count
        });

        console.log(`Email sent for job ${job.id}`);
      } catch (emailError) {
        console.error(`Failed to send email for job ${job.id}:`, emailError);
      }
    }
    
    return res.status(200).json({ 
      success: true,
      notificationsSent: notifications.length,
      notifications
    });

  } catch (error) {
    console.error('Error in check-and-notify:', error);
    return res.status(500).json({ 
      error: error.message
    });
  }
}