import { apiConfig } from './api-config';
import type { PromptTemplate } from '../services/database.service';
import { promptTemplatesService } from '../services/database.service';

export interface GenerateContentRequest {
  prompt: string;
  provider: 'openai' | 'anthropic' | 'google';
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateContentResponse {
  content: string;
  provider: string;
  model: string;
  error?: string;
}

// OpenAI API call
async function callOpenAI(prompt: string, temperature = 0.7, maxTokens = 1000): Promise<GenerateContentResponse> {
  if (!apiConfig.openai.apiKey) {
    return {
      content: '[OpenAI API key not configured - using mock response]\n\n' + generateMockContent(prompt),
      provider: 'openai',
      model: 'mock',
    };
  }

  try {
    const response = await fetch(apiConfig.openai.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional LinkedIn content creator. Create engaging, valuable content.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      provider: 'openai',
      model: apiConfig.openai.model,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      content: generateMockContent(prompt),
      provider: 'openai',
      model: 'mock',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Anthropic Claude API call
async function callAnthropic(prompt: string, temperature = 0.7, maxTokens = 1000): Promise<GenerateContentResponse> {
  if (!apiConfig.anthropic.apiKey) {
    return {
      content: '[Anthropic API key not configured - using mock response]\n\n' + generateMockContent(prompt),
      provider: 'anthropic',
      model: 'mock',
    };
  }

  try {
    const response = await fetch(apiConfig.anthropic.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiConfig.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: apiConfig.anthropic.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      provider: 'anthropic',
      model: apiConfig.anthropic.model,
    };
  } catch (error) {
    console.error('Anthropic API error:', error);
    return {
      content: generateMockContent(prompt),
      provider: 'anthropic',
      model: 'mock',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Google Gemini API call with optional system message, Google Grounding, and URL Context
async function callGoogle(
  prompt: string, 
  temperature = 0.7, 
  _maxTokens = 1048576, 
  systemMessage?: string,
  urls?: string[]
): Promise<GenerateContentResponse> {
  if (!apiConfig.google.apiKey) {
    return {
      content: '[Google API key not configured - using mock response]\n\n' + generateMockContent(prompt),
      provider: 'google',
      model: 'mock',
    };
  }

  try {
    console.log('Calling Gemini 2.5 Pro with Google Grounding:', {
      hasApiKey: !!apiConfig.google.apiKey,
      hasSystemMessage: !!systemMessage,
      promptLength: prompt.length,
      temperature,
      maxTokens: _maxTokens
    });

    // Use the correct Gemini 2.5 PRO endpoint with proper systemInstruction
    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1048576, // 1 million tokens max for Gemini
      }
    };
    
    // Always enable both URL Context and Google Grounding for best results
    const tools = [];
    
    // Always add URL Context tool
    tools.push({
      url_context: {}
    });
    
    // If URLs are explicitly provided, add them to the prompt
    if (urls && urls.length > 0) {
      console.log(`URL Context: ENABLED with ${urls.length} explicitly provided URLs`);
      const urlsText = urls.join('\n');
      requestBody.contents[0].parts[0].text = `${prompt}\n\nReference URLs:\n${urlsText}`;
    } else {
      console.log('URL Context: ENABLED (will auto-detect URLs from prompt)');
    }
    
    // Always add Google Search grounding unless explicitly disabled
    const disableGrounding = import.meta.env.VITE_ENABLE_GOOGLE_GROUNDING === 'false';
    if (!disableGrounding) {
      tools.push({
        google_search: {}
      });
      console.log('Google Grounding: ENABLED');
    } else {
      console.log('Google Grounding: DISABLED (manually turned off via env)');
    }
    
    // Always add tools to the request
    requestBody.tools = tools;
    
    // Add systemInstruction if provided
    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [
          {
            text: systemMessage,
          },
        ],
      };
    }
    
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiConfig.google.apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google API error response:', errorData);
      throw new Error(`Google API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      console.error('No candidates in response:', data);
      throw new Error('No content generated from Gemini');
    }
    
    console.log('Gemini 2.5 Pro response received, length:', data.candidates[0].content.parts[0].text.length);
    
    return {
      content: data.candidates[0].content.parts[0].text,
      provider: 'google',
      model: 'gemini-2.5-pro',
    };
  } catch (error) {
    console.error('Google API error:', error);
    return {
      content: generateMockContent(prompt),
      provider: 'google',
      model: 'mock',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Mock content generator for fallback
function generateMockContent(prompt: string): string {
  const templates = [
    `Here's what I've learned about ${extractTopic(prompt)}:\n\n1. Start with clarity\n2. Focus on value\n3. Be authentic\n4. Engage your audience\n5. Measure and iterate\n\nThe key is consistency and providing genuine value to your network.\n\nWhat's your experience with this?\n\n#LinkedInTips #ContentStrategy #ProfessionalGrowth`,
    
    `${extractTopic(prompt)} changed how I think about business.\n\nHere's why:\n\n→ It simplifies complex decisions\n→ It creates clear priorities\n→ It drives measurable results\n\nThe lesson? Sometimes the simplest solutions are the most powerful.\n\n#BusinessStrategy #Leadership #Growth`,
    
    `3 years ago, I didn't understand ${extractTopic(prompt)}.\n\nToday, it's the foundation of my success.\n\nWhat changed?\n\n• I stopped overthinking\n• I started taking action\n• I learned from failures\n• I stayed consistent\n• I measured everything\n\nProgress > Perfection\n\n#StartupLife #Entrepreneurship #Success`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

function extractTopic(prompt: string): string {
  // Simple extraction - in production, this would be more sophisticated
  const match = prompt.match(/about ([^.!?]+)/);
  return match ? match[1] : 'this topic';
}

// Main function to generate content
export async function generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
  switch (request.provider) {
    case 'openai':
      return callOpenAI(request.prompt, request.temperature, request.maxTokens);
    case 'anthropic':
      return callAnthropic(request.prompt, request.temperature, request.maxTokens);
    case 'google':
      return callGoogle(request.prompt, request.temperature, request.maxTokens);
    default:
      return {
        content: generateMockContent(request.prompt),
        provider: 'mock',
        model: 'mock',
        error: 'Invalid provider specified',
      };
  }
}

// Generate LinkedIn content using database prompts only
export async function generateLinkedInVariations(
  contentIdea: string,
  count: number = 4,
  urls?: string[]
): Promise<GenerateContentResponse[]> {
  console.log('generateLinkedInVariations called with:', { contentIdea, count, urls: urls?.length });
  console.log('Google API Key configured:', !!apiConfig.google.apiKey);
  
  // Check if Google/Gemini is configured
  if (!apiConfig.google.apiKey) {
    throw new Error('Google API key not configured. Please add VITE_GOOGLE_API_KEY to your environment variables.');
  }

  // Load prompts from database
  let templates: PromptTemplate[];
  try {
    const allPrompts = await promptTemplatesService.getAll();
    templates = allPrompts.filter(p => p.category === 'Content Generation' && p.is_active);
    
    if (templates.length === 0) {
      throw new Error('No active Content Generation prompts found. Please create prompts in the Prompts management page.');
    }
    
    console.log(`Found ${templates.length} active Content Generation prompts`);
  } catch (error) {
    console.error('Error loading prompts from database:', error);
    throw new Error('Failed to load prompts from database. Please check your database connection and ensure prompts exist.');
  }

  const variations: Promise<GenerateContentResponse>[] = [];
  
  // Use available templates, cycling through if we need more variations than templates
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const temperature = (template.settings?.temperature || 1.5) + (i * 0.1); // Slight temperature variation
    const maxTokens = template.settings?.max_tokens || 1048576;
    
    console.log(`Generating variation ${i + 1} with template: ${template.name} (temp: ${temperature})`);
    
    if (template.provider === 'google') {
      variations.push(
        callGoogle(
          contentIdea,
          temperature,
          maxTokens,
          template.system_message,
          urls
        )
      );
    } else if (template.provider === 'openai') {
      const fullPrompt = `${template.system_message}\n\nContent Idea: ${contentIdea}`;
      variations.push(
        callOpenAI(fullPrompt, temperature, maxTokens)
      );
    } else if (template.provider === 'anthropic') {
      const fullPrompt = `${template.system_message}\n\nContent Idea: ${contentIdea}`;
      variations.push(
        callAnthropic(fullPrompt, temperature, maxTokens)
      );
    } else {
      // Default to Google
      variations.push(
        callGoogle(
          contentIdea,
          temperature,
          maxTokens,
          template.system_message,
          urls
        )
      );
    }
  }
  
  return Promise.all(variations);
}

// Generate content using a custom prompt template from database
export async function generateWithPrompt(
  contentIdea: string,
  promptTemplate: PromptTemplate,
  count: number = 4,
  urls?: string[]
): Promise<GenerateContentResponse[]> {
  console.log('Generating with custom prompt:', promptTemplate.name);
  console.log('Provider:', promptTemplate.provider);
  console.log('Temperature:', promptTemplate.settings?.temperature);
  console.log('Max Tokens:', promptTemplate.settings?.max_tokens);
  console.log('URLs provided:', urls?.length || 0);
  
  const variations: Promise<GenerateContentResponse>[] = [];
  
  // Generate variations using the same prompt template but with slight variations
  for (let i = 0; i < count; i++) {
    const temperature = (promptTemplate.settings?.temperature || 1.5) + (i * 0.1); // Slight temperature variation
    const maxTokens = promptTemplate.settings?.max_tokens || 1048576;
    
    if (promptTemplate.provider === 'google') {
      variations.push(
        callGoogle(
          contentIdea,
          temperature,
          maxTokens,
          promptTemplate.system_message,
          urls // Pass URLs if provided
        )
      );
    } else if (promptTemplate.provider === 'openai') {
      // For OpenAI, we need to format the prompt differently
      const fullPrompt = `${promptTemplate.system_message}\n\nContent Idea: ${contentIdea}`;
      variations.push(
        callOpenAI(
          fullPrompt,
          temperature,
          maxTokens
        )
      );
    } else if (promptTemplate.provider === 'anthropic') {
      // For Anthropic, we need to format the prompt differently
      const fullPrompt = `${promptTemplate.system_message}\n\nContent Idea: ${contentIdea}`;
      variations.push(
        callAnthropic(
          fullPrompt,
          temperature,
          maxTokens
        )
      );
    } else {
      // Default to Google/Gemini
      variations.push(
        callGoogle(
          contentIdea,
          temperature,
          maxTokens,
          promptTemplate.system_message,
          urls // Pass URLs if provided
        )
      );
    }
  }
  
  return Promise.all(variations);
}

// Generate multiple variations using database prompts
export async function generateVariations(
  prompt: string,
  count: number = 6,
  category: string = 'Content Generation'
): Promise<GenerateContentResponse[]> {
  console.log(`generateVariations called for category: ${category}`);
  
  // Load prompts from database based on category
  let templates: PromptTemplate[];
  try {
    const allPrompts = await promptTemplatesService.getAll();
    templates = allPrompts.filter(p => p.category === category && p.is_active);
    
    if (templates.length === 0) {
      throw new Error(`No active prompts found for category: ${category}. Please create prompts in the Prompts management page.`);
    }
    
    console.log(`Found ${templates.length} active prompts for category: ${category}`);
  } catch (error) {
    console.error('Error loading prompts from database:', error);
    throw new Error('Failed to load prompts from database.');
  }

  const variations: Promise<GenerateContentResponse>[] = [];
  
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const temperature = (template.settings?.temperature || 1.0) + (i * 0.1);
    const maxTokens = template.settings?.max_tokens || 1000;
    
    if (template.provider === 'google') {
      variations.push(
        callGoogle(prompt, temperature, maxTokens, template.system_message)
      );
    } else if (template.provider === 'openai') {
      const fullPrompt = `${template.system_message}\n\nTask: ${prompt}`;
      variations.push(
        callOpenAI(fullPrompt, temperature, maxTokens)
      );
    } else if (template.provider === 'anthropic') {
      const fullPrompt = `${template.system_message}\n\nTask: ${prompt}`;
      variations.push(
        callAnthropic(fullPrompt, temperature, maxTokens)
      );
    }
  }
  
  return Promise.all(variations);
}