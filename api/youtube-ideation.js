// =====================================================
// YOUTUBE TRANSCRIPT IDEATION API
// Extracts YouTube transcripts and generates content ideas
// =====================================================

import { createClient } from '@supabase/supabase-js';

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

  // Load environment variables INSIDE handler (like working process-search.js)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  const apifyApiKey = process.env.APIFY_API_KEY || process.env.VITE_APIFY_API_KEY;

  // Initialize Supabase client INSIDE handler
  const supabase = createClient(supabaseUrl, supabaseKey);

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
    if (!openaiApiKey) missingEnvVars.push('OPENAI_API_KEY or VITE_OPENAI_API_KEY');
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

    // Step 3: Prepare GPT-5 Responses API call (matches working process-search.js)
    console.log('🤖 Processing with GPT-5 Responses API...');
    console.log('📝 Using prompt template:', promptTemplate.name);
    console.log('📝 System message preview (first 500 chars):', promptTemplate.system_message.substring(0, 500));
    console.log('📝 Apify data items count:', apifyData.length);
    
    // Step 4: Call GPT-5 Responses API (EXACT format from process-search.js)
    const gpt5Response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5',
        input: [
          {
            role: 'developer',
            content: [{
              type: 'input_text',
              text: promptTemplate.system_message
            }]
          },
          {
            role: 'user',
            content: [{
              type: 'input_text',
              text: `=Transcript : \n\n${JSON.stringify(apifyData)}`
            }]
          }
        ],
        reasoning: { effort: 'medium' },
        temperature: 1,
        max_output_tokens: 8192
      })
    });

    if (!gpt5Response.ok) {
      const errorData = await gpt5Response.json().catch(() => ({}));
      console.error('❌ GPT-5 API error:', gpt5Response.status, errorData);
      throw new Error(`GPT-5 API error: ${gpt5Response.status}`);
    }

    const gpt5Data = await gpt5Response.json();
    
    // Extract response from Responses API format (EXACT match to process-search.js)
    let responseText = '';
    
    if (gpt5Data.output && Array.isArray(gpt5Data.output)) {
      // Find the message output (usually the second item)
      const messageOutput = gpt5Data.output.find(o => o.type === 'message');
      if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
        const textContent = messageOutput.content.find(c => c.type === 'output_text');
        if (textContent && textContent.text) {
          responseText = textContent.text;
        }
      }
    }
    
    // Fallback to other possible locations
    if (!responseText) {
      responseText = gpt5Data.content || gpt5Data.text || gpt5Data.response || '';
    }

    if (!responseText) {
      console.error('❌ No response text from GPT-5');
      console.log('GPT-5 response structure:', JSON.stringify(gpt5Data, null, 2));
      return res.status(500).json({ error: 'No response generated from GPT-5' });
    }

    console.log('✅ GPT-5 response generated:', responseText.length, 'characters');
    console.log('📋 Full GPT-5 response text (first 1000 chars):', responseText.substring(0, 1000));

    // DEBUG: Log the raw GPT-5 response for analysis
    console.log('🔍 Raw GPT-5 response structure analysis:');
    console.log('Response starts with:', responseText.substring(0, 200));
    console.log('Contains numbered items:', /\d+\)/.test(responseText));
    console.log('Contains Title: format:', /Title:/.test(responseText));

    // Step 5: Parse the 5 content ideas from the response
    const ideas = parseContentIdeas(responseText);
    
    if (ideas.length === 0) {
      console.error('❌ No content ideas parsed from response');
      console.log('Raw GPT-5 response was:', responseText);
      return res.status(500).json({ 
        error: 'Failed to parse content ideas from GPT-5 response',
        details: 'GPT-5 responded but no ideas could be extracted',
        responsePreview: responseText.substring(0, 1000),
        promptUsed: promptTemplate.name
      });
    }

    console.log('🎯 Parsed', ideas.length, 'content ideas');
    console.log('📝 First idea structure:', JSON.stringify(ideas[0], null, 2));

    // Step 6: Save each idea to the database
    const savedIdeas = [];
    
    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i];
      
      const { data: savedIdea, error: saveError } = await supabase
        .from('content_ideas')
        .insert({
          title: idea.title,
          description: idea.description,
          hook: idea.hook,
          key_points: idea.keyPoints || [],
          target_audience: idea.targetAudience,
          content_format: idea.contentFormat,
          category: idea.category,
          priority: idea.engagementScore >= 8 ? 'high' : idea.engagementScore >= 6 ? 'medium' : 'low',
          status: 'ready',
          score: idea.engagementScore,
          ai_model: 'gpt-5',
          ai_reasoning_effort: 'medium',
          linkedin_style: idea.linkedInStyle,
          hashtags: idea.tags || [],
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
        console.log(`📝 Idea that failed to save:`, JSON.stringify(idea, null, 2));
      } else {
        savedIdeas.push(savedIdea);
        console.log(`✅ Saved idea ${i + 1}:`, idea.title);
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
    
    // Handle the specific GPT-5 response format with "Title:" and "Thesis:" structure
    let sections = [];
    
    // Try splitting by numbered patterns first (like "1) Title:", "2) Title:", etc.)
    if (responseText.includes('Title:')) {
      console.log('📝 Detected Title: format, using numbered Title pattern');
      const numberedTitleSections = responseText.split(/(?=\d+\)\s*Title:)/).filter(s => s.trim());
      console.log('📝 Numbered title sections found:', numberedTitleSections.length);
      
      // Remove intro text (anything before first numbered title)
      const startIndex = numberedTitleSections.findIndex(s => /^\d+\)\s*Title:/.test(s.trim()));
      if (startIndex >= 0) {
        sections = numberedTitleSections.slice(startIndex);
        console.log('📝 Using title-based sections:', sections.length);
      }
    }
    
    // Fallback to double newline separation
    if (sections.length === 0) {
      console.log('📝 Falling back to double newline split');
      sections = responseText.split('\n\n').filter(section => section.trim() !== '');
      console.log('📝 Double newline sections:', sections.length);
      
      // Remove intro if it exists
      if (sections.length > 0 && (sections[0].toLowerCase().includes('content idea') || sections[0].length < 100)) {
        sections = sections.slice(1);
        console.log('📝 Removed intro, sections count:', sections.length);
      }
    }
    
    // Final fallback: try basic numbered pattern
    if (sections.length < 3) {
      console.log('📝 Final fallback: basic numbered pattern');
      const numberedSections = responseText.split(/\n(?=\d+[\.)]\s)/).filter(s => s.trim());
      const startIndex = numberedSections.findIndex(s => /^\d+[\.)]\s/.test(s.trim()));
      if (startIndex >= 0) {
        sections = numberedSections.slice(startIndex);
      }
    }
    
    console.log('📝 Final sections to process:', sections.length);
    if (sections.length > 0) {
      console.log('📝 First section preview:', sections[0]?.substring(0, 150));
    }
    
    // Process each idea - handle the Title/Thesis format from GPT-5
    const ideas = sections.slice(0, 5).map((idea, index) => {
      console.log(`\n📝 Processing idea ${index + 1}:`, idea.substring(0, 100));
      
      // Clean up the idea text
      let cleanIdea = idea.trim()
        .replace(/^[\d\.)]+\s*/, ''); // Remove leading numbers like "1)" or "1."
      
      console.log(`📝 Clean idea ${index + 1}:`, cleanIdea.substring(0, 100));
      
      // Extract title and content based on the GPT-5 format
      let title = `YouTube Content Idea ${index + 1}`;
      let description = cleanIdea;
      let hook = '';
      
      // Check if this is the Title/Thesis format
      const titleMatch = cleanIdea.match(/Title:\s*(.+?)(?=\n|$)/);
      const thesisMatch = cleanIdea.match(/Thesis:\s*(.+?)(?=\n|$)/);
      
      if (titleMatch) {
        title = titleMatch[1].trim();
        console.log(`📝 Extracted title ${index + 1}:`, title);
      }
      
      if (thesisMatch) {
        hook = thesisMatch[1].trim();
        console.log(`📝 Extracted thesis ${index + 1}:`, hook.substring(0, 100));
      }
      
      // If no specific format, use first line as title
      if (!titleMatch) {
        const lines = cleanIdea.split('\n').filter(line => line.trim());
        if (lines[0]) {
          title = lines[0].substring(0, 100).trim();
        }
      }
      
      // If no thesis, use first compelling line as hook
      if (!hook) {
        const lines = cleanIdea.split('\n').filter(line => line.trim());
        hook = lines.find(line => line.length > 20 && !line.includes('Title:')) || 
               cleanIdea.substring(0, 150) + '...';
      }
      
      console.log(`📝 Final title ${index + 1}:`, title);
      console.log(`📝 Final hook ${index + 1}:`, hook.substring(0, 100));
      console.log(`📝 Description length ${index + 1}:`, description.length);
      
      // Extract key points from Core points section or bullet points
      const lines = cleanIdea.split('\n').filter(line => line.trim());
      const keyPoints = lines.filter(line => 
        line.trim().startsWith('-') || 
        line.trim().startsWith('•') ||
        (line.includes(':') && line.length < 200)
      ).slice(0, 4);
      
      return {
        title: title,
        description: description,
        hook: hook,
        keyPoints: keyPoints.length > 0 ? keyPoints : lines.slice(1, 4).filter(line => line.length > 10),
        targetAudience: 'RevOps professionals and B2B leaders',
        contentFormat: 'thought-leadership',
        category: 'RevOps',
        engagementScore: 8, // Default high score for curated YouTube content
        linkedInStyle: 'provocative',
        tags: ['RevOps', 'YouTube', 'Content'],
        source: 'youtube'
      };
    }).filter(idea => idea && idea.description && idea.description.length > 20); // Only include substantial ideas
    
    console.log('📝 Parsed ideas count:', ideas.length);
    console.log('📝 Ideas titles:', ideas.map(idea => idea.title));
    
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