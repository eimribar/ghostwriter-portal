// Supabase Edge Function to process GPT-5 searches in the background
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'https://esm.sh/resend@6.0.1';

// Environment variables (set in Supabase dashboard)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@ghostwriter.com';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const resend = new Resend(RESEND_API_KEY);

interface SearchJobPayload {
  jobId: string;
}

serve(async (req: Request) => {
  try {
    const { jobId } = await req.json() as SearchJobPayload;
    
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Missing jobId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing search job: ${jobId}`);

    // Get the job details
    const { data: job, error: jobError } = await supabase
      .from('search_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Update job status to processing
    await supabase
      .from('search_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Call GPT-5 Responses API with web search
    const gpt5Response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
                     Return exactly 10 content ideas in a structured JSON format.`
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
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'content_ideas',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                ideas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      hook: { type: 'string' },
                      category: { type: 'string' },
                      targetAudience: { type: 'string' },
                      contentFormat: { type: 'string' },
                      keyPoints: { type: 'array', items: { type: 'string' } },
                      engagementScore: { type: 'number' },
                      tags: { type: 'array', items: { type: 'string' } },
                      linkedInStyle: { type: 'string' },
                      newsUrl: { type: 'string' },
                      publishedDate: { type: 'string' }
                    },
                    required: ['title', 'description', 'hook', 'category', 'engagementScore']
                  }
                }
              },
              required: ['ideas']
            }
          }
        }
      }),
    });

    if (!gpt5Response.ok) {
      const errorText = await gpt5Response.text();
      throw new Error(`GPT-5 API error: ${errorText}`);
    }

    const gpt5Data = await gpt5Response.json();
    const ideas = JSON.parse(gpt5Data.content.text).ideas;

    // Save ideas to database
    const ideaIds: string[] = [];
    for (const idea of ideas) {
      const { data: savedIdea, error: saveError } = await supabase
        .from('content_ideas')
        .insert([{
          source: 'ai',
          title: idea.title,
          description: idea.description,
          hook: idea.hook,
          key_points: idea.keyPoints,
          target_audience: idea.targetAudience,
          content_format: idea.contentFormat,
          category: idea.category,
          priority: idea.engagementScore >= 8 ? 'high' : idea.engagementScore >= 6 ? 'medium' : 'low',
          status: 'ready',
          score: idea.engagementScore,
          ai_model: 'gpt-5',
          ai_reasoning_effort: 'medium',
          linkedin_style: idea.linkedInStyle,
          hashtags: idea.tags,
          trend_reference: idea.newsUrl
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
        result_summary: `Generated ${ideas.length} content ideas with average score ${(ideas.reduce((acc: number, i: any) => acc + i.engagementScore, 0) / ideas.length).toFixed(1)}`,
        processing_time_seconds: processingSeconds
      })
      .eq('id', jobId);

    // Send email notification
    const topIdeas = ideas
      .sort((a: any, b: any) => b.engagementScore - a.engagementScore)
      .slice(0, 3)
      .map((idea: any) => ({
        title: idea.title,
        description: idea.description,
        score: idea.engagementScore
      }));

    await resend.emails.send({
      from: 'Ghostwriter Portal <onboarding@resend.dev>',
      to: [ADMIN_EMAIL],
      subject: `✨ Your Content Ideas Are Ready! (${ideas.length} ideas found)`,
      html: generateEmailHtml({
        searchQuery: job.search_query,
        resultCount: ideas.length,
        topIdeas,
        searchDuration: duration,
        jobId
      })
    });

    // Mark notification as sent
    await supabase
      .from('search_jobs')
      .update({ notification_sent: true })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ideasGenerated: ideas.length,
        jobId 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing search job:', error);
    
    // Try to update job status to failed
    if (req.json && (await req.json() as any).jobId) {
      const { jobId } = await req.json() as SearchJobPayload;
      await supabase
        .from('search_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Send failure email
      await resend.emails.send({
        from: 'Ghostwriter Portal <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `⚠️ Search Failed`,
        html: `<p>Your search job failed with error: ${error.message}</p><p>Job ID: ${jobId}</p>`
      });
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateEmailHtml(data: any): string {
  const topIdeasHtml = data.topIdeas
    .map((idea: any, index: number) => `
      <li style="margin-bottom: 12px;">
        <strong>${index + 1}. ${idea.title}</strong> (Score: ${idea.score}/10)<br/>
        <span style="color: #666;">${idea.description}</span>
      </li>
    `)
    .join('');

  return `
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✨ Your Content Ideas Are Ready!</h1>
          </div>
          <div class="content">
            <p><strong>Search:</strong> "${data.searchQuery}"</p>
            <div class="stats">
              <div class="stat">
                <div style="font-size: 24px; font-weight: bold; color: #667eea;">${data.resultCount}</div>
                <div style="font-size: 12px; color: #666;">Ideas Generated</div>
              </div>
              <div class="stat">
                <div style="font-size: 24px; font-weight: bold; color: #667eea;">${data.searchDuration}</div>
                <div style="font-size: 12px; color: #666;">Search Time</div>
              </div>
            </div>
            <h3>Top Ideas:</h3>
            <ol>${topIdeasHtml}</ol>
            <div style="text-align: center;">
              <a href="https://ghostwriter-portal.vercel.app/ideation" class="button" style="color: white;">View All Results →</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}