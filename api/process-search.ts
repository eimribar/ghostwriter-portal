// Vercel Serverless Function to process background searches
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.VITE_RESEND_API_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'Missing jobId' });
  }

  try {
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

    // Call GPT-5 API
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        input: [
          {
            role: 'developer',
            content: [{
              type: 'input_text',
              text: `You are an expert content strategist. Search for and analyze the latest news to generate 10 content ideas.`
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
        reasoning: { effort: 'medium' }
      }),
    });

    const data = await response.json();
    
    // Parse results (simplified - you'd parse the actual response)
    const ideas = data.content?.ideas || [];
    
    // Save ideas to database
    const ideaIds: string[] = [];
    for (const idea of ideas) {
      const { data: saved } = await supabase
        .from('content_ideas')
        .insert([{
          source: 'ai',
          title: idea.title,
          description: idea.description,
          status: 'ready',
          ai_model: 'gpt-5'
        }])
        .select()
        .single();
      
      if (saved) {
        ideaIds.push(saved.id);
      }
    }

    // Update job as completed
    await supabase
      .from('search_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_count: ideas.length,
        ideas_generated: ideaIds
      })
      .eq('id', jobId);

    // Send email
    await resend.emails.send({
      from: 'Ghostwriter Portal <onboarding@resend.dev>',
      to: [process.env.VITE_ADMIN_EMAIL!],
      subject: `✨ Your Content Ideas Are Ready!`,
      html: `
        <h2>Search Complete!</h2>
        <p>Your search "${job.search_query}" has completed.</p>
        <p>${ideas.length} ideas generated.</p>
        <p><a href="https://ghostwriter-portal.vercel.app/ideation">View Results</a></p>
      `
    });

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Error:', error);
    
    // Update job as failed
    await supabase
      .from('search_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return res.status(500).json({ error: error.message });
  }
}