// Vercel Serverless Function to process background searches
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'Missing jobId' });
  }

  try {
    console.log(`Processing job ${jobId}`);
    
    // Import required modules
    const { createClient } = await import('@supabase/supabase-js');
    const { Resend } = await import('resend');
    
    // Initialize clients
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const resend = new Resend(process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY);

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from('search_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Update to processing
    await supabase
      .from('search_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Check for API key
    const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    
    // Call GPT-5 API
    console.log('Calling GPT-5 API...');
    console.log('API Key exists:', !!openaiKey);
    console.log('API Key prefix:', openaiKey?.substring(0, 20));
    
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        input: [
          {
            role: 'developer',
            content: [{
              type: 'input_text',
              text: `You are an expert content strategist specializing in LinkedIn content for B2B SaaS companies.
                     Search for and analyze the latest news, trends, and discussions to generate content ideas.
                     Focus on practical, actionable insights that will resonate with the target audience.
                     Return exactly 10 content ideas in a structured JSON format.
                     
                     Each idea should have:
                     - title: A compelling headline
                     - description: 2-3 sentence description
                     - hook: Opening line to grab attention
                     - category: The content category
                     - targetAudience: Who this is for
                     - contentFormat: Type of content (e.g., thought-leadership, how-to, data-driven)
                     - keyPoints: Array of 3-4 main points
                     - engagementScore: Score from 1-10
                     - tags: Array of relevant hashtags
                     - linkedInStyle: Writing style (professional, provocative, conversational)
                     
                     Return as JSON with structure: { "ideas": [...] }`
            }]
          },
          {
            role: 'user',
            content: [{
              type: 'input_text',
              text: job.search_query
            }]
          }
        ],
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
        reasoning: { effort: 'medium' },
        temperature: 1,
        max_output_tokens: 8192
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GPT-5 API error: ${errorText}`);
    }

    const gptData = await response.json();
    console.log('GPT-5 response received');
    
    // Parse the response
    let ideas = [];
    try {
      const content = gptData.content || gptData.choices?.[0]?.message?.content || '';
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      ideas = parsed.ideas || [];
    } catch (parseError) {
      console.error('Error parsing GPT-5 response:', parseError);
      ideas = [];
    }

    console.log(`Parsed ${ideas.length} ideas`);

    // Save ideas to database
    const ideaIds = [];
    for (const idea of ideas) {
      const { data: savedIdea, error: saveError } = await supabase
        .from('content_ideas')
        .insert([{
          source: 'ai',
          title: idea.title || 'Untitled',
          description: idea.description || '',
          hook: idea.hook || '',
          key_points: idea.keyPoints || [],
          target_audience: idea.targetAudience || '',
          content_format: idea.contentFormat || '',
          category: idea.category || '',
          priority: idea.engagementScore >= 8 ? 'high' : idea.engagementScore >= 6 ? 'medium' : 'low',
          status: 'ready',
          score: idea.engagementScore || 5,
          ai_model: 'gpt-5',
          ai_reasoning_effort: 'medium',
          linkedin_style: idea.linkedInStyle || '',
          hashtags: idea.tags || []
        }])
        .select()
        .single();

      if (savedIdea && !saveError) {
        ideaIds.push(savedIdea.id);
      }
    }

    // Calculate processing time
    const startTime = new Date(job.started_at || job.created_at).getTime();
    const endTime = new Date().getTime();
    const processingSeconds = Math.floor((endTime - startTime) / 1000);
    const duration = `${Math.floor(processingSeconds / 60)}m ${processingSeconds % 60}s`;

    // Update job as completed
    await supabase
      .from('search_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_count: ideas.length,
        ideas_generated: ideaIds,
        result_summary: `Generated ${ideas.length} content ideas`,
        processing_time_seconds: processingSeconds
      })
      .eq('id', jobId);

    // Send email notification
    try {
      const topIdeas = ideas
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 3);

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
                <p style="margin: 10px 0 0 0; opacity: 0.9;">GPT-5 search completed successfully</p>
              </div>
              <div class="content">
                <p><strong>Search Query:</strong> "${job.search_query}"</p>
                
                <div class="stat">
                  <strong>${ideas.length}</strong> ideas generated in <strong>${duration}</strong>
                </div>

                <h3>Top 3 Ideas:</h3>
                <ol>
                  ${topIdeas.map((idea, i) => `
                    <li style="margin-bottom: 15px;">
                      <strong>${idea.title}</strong> (Score: ${idea.engagementScore}/10)<br/>
                      <span style="color: #666;">${idea.description}</span>
                    </li>
                  `).join('')}
                </ol>

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
        to: [process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'eimrib@yess.ai'],
        subject: `✨ Your Content Ideas Are Ready! (${ideas.length} ideas found)`,
        html: emailHtml
      });

      await supabase
        .from('search_jobs')
        .update({ notification_sent: true })
        .eq('id', jobId);

      console.log('Email sent successfully');
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    return res.status(200).json({ 
      success: true, 
      ideasGenerated: ideas.length,
      jobId 
    });

  } catch (error) {
    console.error('Error processing job:', error);
    
    // Try to update job status to failed
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
      );
      
      await supabase
        .from('search_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return res.status(500).json({ 
      error: error.message,
      jobId 
    });
  }
}