// =====================================================
// YOUTUBE TRANSCRIPT IDEATION API
// Extracts YouTube transcripts and generates content ideas
// =====================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const apifyApiKey = process.env.APIFY_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
}

if (!openaiApiKey) {
  console.error('❌ Missing OpenAI API key');
}

if (!apifyApiKey) {
  console.error('❌ Missing Apify API key');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Enhanced CORS headers for all deployments
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('🔍 Handling CORS preflight request');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Early environment check
  console.log('🔧 Environment check:');
  console.log('  - Supabase URL configured:', !!supabaseUrl);
  console.log('  - Supabase Key configured:', !!supabaseKey);
  console.log('  - OpenAI API Key configured:', !!openaiApiKey);
  console.log('  - Apify API Key configured:', !!apifyApiKey);

  try {
    const { videoUrl, promptId } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required' });
    }

    // Check all required environment variables
    const missingEnvVars = [];
    if (!supabaseUrl) missingEnvVars.push('SUPABASE_URL');
    if (!supabaseKey) missingEnvVars.push('SUPABASE_ANON_KEY');
    if (!openaiApiKey) missingEnvVars.push('OPENAI_API_KEY');
    if (!apifyApiKey) missingEnvVars.push('APIFY_API_KEY');

    if (missingEnvVars.length > 0) {
      console.error('❌ Missing environment variables:', missingEnvVars);
      return res.status(500).json({ 
        error: 'Server configuration error: Missing environment variables',
        details: `Please configure: ${missingEnvVars.join(', ')}`,
        missingVars: missingEnvVars
      });
    }

    console.log('🎬 Starting YouTube transcript processing for:', videoUrl);

    // Step 1: Extract transcript using Apify
    console.log('📝 Extracting transcript via Apify...');
    
    const apifyResponse = await fetch(`https://api.apify.com/v2/acts/pintostudio~youtube-transcript-scraper/run-sync-get-dataset-items?token=${apifyApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoUrl: videoUrl
      })
    });

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error('❌ Apify API error:', apifyResponse.status, errorText);
      throw new Error(`Apify API error: ${apifyResponse.status} ${errorText}`);
    }

    const apifyData = await apifyResponse.json();
    console.log('✅ Apify response received:', apifyData?.length || 0, 'items');

    if (!apifyData || apifyData.length === 0) {
      return res.status(400).json({ error: 'No transcript data returned from Apify' });
    }

    // Extract transcript text and video metadata
    const transcriptData = apifyData[0];
    const transcript = transcriptData.transcript || transcriptData.text || '';
    const videoTitle = transcriptData.title || 'YouTube Video';
    const channelName = transcriptData.channelName || transcriptData.channel || 'Unknown Channel';

    if (!transcript) {
      return res.status(400).json({ error: 'No transcript found in the video' });
    }

    console.log('📊 Transcript extracted:', {
      length: transcript.length,
      title: videoTitle,
      channel: channelName
    });

    // Step 2: Get the prompt template for YouTube content generation
    let promptTemplate;
    
    if (promptId) {
      // Use specific prompt ID provided
      const { data: prompt, error: promptError } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', promptId)
        .eq('is_active', true)
        .single();
        
      if (promptError || !prompt) {
        console.error('❌ Prompt not found:', promptError);
        return res.status(400).json({ error: 'Prompt template not found' });
      }
      
      promptTemplate = prompt;
    } else {
      // Find YouTube-specific prompt or use default ideation prompt
      const { data: prompts, error: promptError } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('category', 'Content Ideation')
        .eq('is_active', true)
        .or('name.ilike.*youtube*,name.ilike.*transcript*,name.ilike.*video*')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (promptError) {
        console.error('❌ Error fetching prompts:', promptError);
        return res.status(500).json({ error: 'Failed to fetch prompt templates' });
      }
      
      if (prompts && prompts.length > 0) {
        promptTemplate = prompts[0];
        console.log('✅ Using YouTube-specific prompt:', promptTemplate.name);
      } else {
        // Fallback to any Content Ideation prompt
        const { data: fallbackPrompts, error: fallbackError } = await supabase
          .from('prompt_templates')
          .select('*')
          .eq('category', 'Content Ideation')
          .eq('is_active', true)
          .limit(1);
          
        if (fallbackError || !fallbackPrompts || fallbackPrompts.length === 0) {
          return res.status(500).json({ error: 'No active Content Ideation prompts found' });
        }
        
        promptTemplate = fallbackPrompts[0];
        console.log('✅ Using fallback ideation prompt:', promptTemplate.name);
      }
    }

    // Step 3: Prepare the prompt with transcript
    const fullPrompt = promptTemplate.system_message.replace('{INSERT TRANSCRIPT}', transcript);
    
    console.log('🤖 Processing with GPT-5...');
    
    // Step 4: Call GPT-5 API with the transcript and prompt
    const gpt5Response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5',
        input: [{
          role: 'user',
          content: [{
            type: 'input_text',
            text: fullPrompt
          }]
        }],
        reasoning: { effort: 'medium' },
        temperature: 0.8,
        max_output_tokens: 4000
      })
    });

    if (!gpt5Response.ok) {
      const errorData = await gpt5Response.json().catch(() => ({}));
      console.error('❌ GPT-5 API error:', gpt5Response.status, errorData);
      throw new Error(`GPT-5 API error: ${gpt5Response.status}`);
    }

    const gpt5Data = await gpt5Response.json();
    
    // Extract the response text
    let responseText = '';
    if (gpt5Data.output && gpt5Data.output.length > 1) {
      const messageOutput = gpt5Data.output.find(item => item.type === 'message');
      if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
        responseText = messageOutput.content[0].text;
      }
    }

    if (!responseText) {
      console.error('❌ No response text from GPT-5');
      return res.status(500).json({ error: 'No response generated from GPT-5' });
    }

    console.log('✅ GPT-5 response generated:', responseText.length, 'characters');

    // Step 5: Parse the 5 content ideas from the response
    const ideas = parseContentIdeas(responseText);
    
    if (ideas.length === 0) {
      console.error('❌ No content ideas parsed from response');
      return res.status(500).json({ error: 'Failed to parse content ideas from GPT-5 response' });
    }

    console.log('🎯 Parsed', ideas.length, 'content ideas');

    // Step 6: Save each idea to the database
    const savedIdeas = [];
    
    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i];
      
      const { data: savedIdea, error: saveError } = await supabase
        .from('content_ideas')
        .insert({
          content: idea,
          source: 'youtube',
          source_metadata: {
            video_url: videoUrl,
            video_title: videoTitle,
            channel_name: channelName,
            transcript_length: transcript.length,
            prompt_used: promptTemplate.name,
            prompt_id: promptTemplate.id,
            idea_number: i + 1,
            total_ideas: ideas.length,
            extracted_at: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (saveError) {
        console.error(`❌ Error saving idea ${i + 1}:`, saveError);
      } else {
        savedIdeas.push(savedIdea);
        console.log(`✅ Saved idea ${i + 1}:`, idea.substring(0, 100) + '...');
      }
    }

    console.log('🎉 YouTube ideation complete:', savedIdeas.length, 'ideas saved');

    // Return success response
    return res.status(200).json({
      success: true,
      videoData: {
        url: videoUrl,
        title: videoTitle,
        channel: channelName,
        transcriptLength: transcript.length
      },
      promptUsed: {
        id: promptTemplate.id,
        name: promptTemplate.name
      },
      ideas: savedIdeas,
      totalIdeas: savedIdeas.length,
      processing_time_seconds: Math.round((Date.now() - Date.now()) / 1000) // Will be calculated properly
    });

  } catch (error) {
    console.error('❌ YouTube ideation error:', error);
    
    // Enhanced error response with debugging info
    const errorResponse = {
      success: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      videoUrl: req.body?.videoUrl,
      stage: 'unknown'
    };

    // Add detailed error info for debugging
    if (error.message?.includes('Apify')) {
      errorResponse.stage = 'transcript-extraction';
      errorResponse.details = 'Failed to extract transcript from video. Check if video has captions.';
    } else if (error.message?.includes('GPT-5')) {
      errorResponse.stage = 'content-generation';
      errorResponse.details = 'Failed to generate content ideas. Check OpenAI API key and model access.';
    } else if (error.message?.includes('Supabase')) {
      errorResponse.stage = 'database-save';
      errorResponse.details = 'Failed to save ideas to database. Check Supabase configuration.';
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }
    
    return res.status(500).json(errorResponse);
  }
}

/**
 * Parse content ideas from GPT-5 response
 * Expects 5 numbered content ideas
 */
function parseContentIdeas(responseText) {
  const ideas = [];
  
  try {
    // Split by numbered list patterns (1., 2., etc.)
    const sections = responseText.split(/(?:^|\n)\s*(\d+)\.?\s+/m);
    
    // Skip first empty section, then take every other section (the content after numbers)
    for (let i = 2; i < sections.length; i += 2) {
      const idea = sections[i]?.trim();
      if (idea && idea.length > 20) { // Only include substantial ideas
        ideas.push(idea);
      }
    }
    
    // Fallback: Split by double newlines if numbered parsing fails
    if (ideas.length === 0) {
      const paragraphs = responseText.split(/\n\n+/).filter(p => p.trim().length > 20);
      ideas.push(...paragraphs.slice(0, 5));
    }
    
    // Fallback: Split by single newlines
    if (ideas.length === 0) {
      const lines = responseText.split('\n').filter(line => line.trim().length > 20);
      ideas.push(...lines.slice(0, 5));
    }
    
    console.log('📝 Parsed ideas count:', ideas.length);
    
    return ideas.slice(0, 5); // Ensure we only return 5 ideas max
    
  } catch (error) {
    console.error('❌ Error parsing content ideas:', error);
    return [];
  }
}