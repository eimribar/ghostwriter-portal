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

  // Early environment check with more debugging info
  console.log('🔧 Environment check:');
  console.log('  - Supabase URL configured:', !!supabaseUrl, supabaseUrl?.substring(0, 30) + '...');
  console.log('  - Supabase Key configured:', !!supabaseKey, supabaseKey?.substring(0, 20) + '...');
  console.log('  - OpenAI API Key configured:', !!openaiApiKey, openaiApiKey?.substring(0, 20) + '...');
  console.log('  - Apify API Key configured:', !!apifyApiKey, apifyApiKey?.substring(0, 20) + '...');
  
  // Additional OpenAI API key checks
  if (openaiApiKey) {
    console.log('  - OpenAI API Key length:', openaiApiKey.length);
    console.log('  - OpenAI API Key starts with sk-:', openaiApiKey.startsWith('sk-'));
  }

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
    
    // Log the full Apify response structure for debugging
    console.log('📋 Full Apify response structure:', JSON.stringify(apifyData, null, 2));

    if (!apifyData || apifyData.length === 0) {
      return res.status(400).json({ 
        error: 'No data returned from Apify', 
        details: 'The video may not be accessible or may not have available data'
      });
    }

    // Extract video metadata for storage (if available)
    const firstItem = apifyData[0] || {};
    const videoTitle = firstItem.title || firstItem.videoTitle || firstItem.name || 'YouTube Video';
    const channelName = firstItem.channelName || firstItem.channel || firstItem.channelTitle || firstItem.author || firstItem.uploader || 'Unknown Channel';

    console.log('📊 Video metadata extracted:', {
      videoTitle: videoTitle,
      channelName: channelName,
      dataItemsCount: apifyData.length
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

    // Step 3: Prepare the prompt for GPT-5 Responses API (thinking model)
    console.log('🤖 Processing with GPT-5 Responses API (thinking model)...');
    
    // Combine system message and transcript data like your working implementations
    const fullPrompt = promptTemplate.system_message + "\n\n=Transcript : \n\n" + JSON.stringify(apifyData);
    
    // Step 4: Call GPT-5 Responses API (matches your working process-search.js format)
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
    
    // Extract the response text from GPT-5 Responses API format (matches your working implementations)
    let responseText = '';
    if (gpt5Data.output && gpt5Data.output.length > 0) {
      // Look for message type in output array
      const messageOutput = gpt5Data.output.find(item => item.type === 'message');
      if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
        responseText = messageOutput.content[0].text;
      }
    }
    
    // Fallback: check for direct output_text field
    if (!responseText && gpt5Data.output_text) {
      responseText = gpt5Data.output_text;
    }

    if (!responseText) {
      console.error('❌ No response text from GPT-5');
      console.log('GPT-5 response structure:', JSON.stringify(gpt5Data, null, 2));
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
            apify_data_items: apifyData.length,
            prompt_used: promptTemplate.name,
            prompt_id: promptTemplate.id,
            idea_number: i + 1,
            total_ideas: ideas.length,
            extracted_at: new Date().toISOString(),
            processing_method: 'n8n_workflow_replication'
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
        apifyDataItems: apifyData.length
      },
      promptUsed: {
        id: promptTemplate.id,
        name: promptTemplate.name
      },
      ideas: savedIdeas,
      totalIdeas: savedIdeas.length,
      processingMethod: 'n8n_workflow_replication'
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
 * Parse content ideas from GPT-5 response - matches n8n Code node logic exactly
 */
function parseContentIdeas(responseText) {
  try {
    console.log('📝 Parsing GPT-5 response (first 500 chars):', responseText.substring(0, 500));
    
    // Split the text into sections - each idea is separated by double newlines
    let sections = responseText.split('\n\n').filter(section => section.trim() !== '');
    
    // Remove the intro line if it exists
    if (sections.length > 0 && sections[0].toLowerCase().includes('content idea')) {
      sections = sections.slice(1);
    }
    
    // If still not enough ideas, try splitting by numbered patterns
    if (sections.length < 5) {
      // Try splitting by patterns like "1)" or "1." at the start of lines
      const numberedSections = responseText.split(/\n(?=\d+[\.)]\s)/).filter(s => s.trim());
      
      // Remove any intro text
      const startIndex = numberedSections.findIndex(s => /^\d+[\.)]\s/.test(s.trim()));
      if (startIndex >= 0) {
        sections = numberedSections.slice(startIndex);
      }
    }
    
    // Process each idea - match n8n Code node logic exactly
    const ideas = sections.slice(0, 5).map((idea, index) => {
      // Clean up the idea text
      const cleanIdea = idea.trim()
        .replace(/^[\d\.)]+\s*/, '') // Remove leading numbers like "1)" or "1."
        .replace(/^\*\*/, '') // Remove leading bold markers
        .replace(/\*\*$/, ''); // Remove trailing bold markers
      
      return cleanIdea;
    }).filter(idea => idea && idea.length > 20); // Only include substantial ideas
    
    console.log('📝 Parsed ideas count:', ideas.length);
    
    // Ensure we return at least something
    if (ideas.length === 0) {
      console.error('❌ Could not parse any content ideas');
      console.log('Raw response text:', responseText);
      return [];
    }
    
    return ideas;
    
  } catch (error) {
    console.error('❌ Error parsing content ideas:', error);
    return [];
  }
}