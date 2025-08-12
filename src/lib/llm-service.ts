import { apiConfig } from './api-config';

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

// Google Gemini API call
async function callGoogle(prompt: string, temperature = 0.7, maxTokens = 1000): Promise<GenerateContentResponse> {
  if (!apiConfig.google.apiKey) {
    return {
      content: '[Google API key not configured - using mock response]\n\n' + generateMockContent(prompt),
      provider: 'google',
      model: 'mock',
    };
  }

  try {
    // Use the correct Gemini 2.5 Flash endpoint with proper headers
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiConfig.google.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a professional LinkedIn content creator. Create engaging, valuable content.
                  
                  ${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topK: 40,
            topP: 0.95,
            thinkingConfig: {
              thinkingBudget: 0  // Disable thinking for faster response
            }
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google API error response:', errorData);
      throw new Error(`Google API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('No content generated from Gemini');
    }
    
    return {
      content: data.candidates[0].content.parts[0].text,
      provider: 'google',
      model: 'gemini-2.5-flash',
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

// Generate multiple variations
export async function generateVariations(
  prompt: string,
  count: number = 6
): Promise<GenerateContentResponse[]> {
  // Check which providers are configured
  const hasGoogle = !!apiConfig.google.apiKey;
  const hasOpenAI = !!apiConfig.openai.apiKey;
  const hasAnthropic = !!apiConfig.anthropic.apiKey;
  
  const variations: Promise<GenerateContentResponse>[] = [];
  
  // If Google is configured, use it for all variations with different temperatures
  if (hasGoogle) {
    for (let i = 0; i < count; i++) {
      variations.push(
        generateContent({
          prompt: `${prompt}\n\nVariation ${i + 1}: Make this unique and engaging with a different perspective.`,
          provider: 'google',
          temperature: 0.6 + (i * 0.1), // Vary temperature from 0.6 to 1.1 for diversity
        })
      );
    }
  } 
  // Fallback to other providers if available
  else if (hasOpenAI || hasAnthropic) {
    const providers = [];
    if (hasOpenAI) providers.push('openai' as const);
    if (hasAnthropic) providers.push('anthropic' as const);
    
    for (let i = 0; i < count; i++) {
      const provider = providers[i % providers.length] as 'openai' | 'anthropic';
      variations.push(
        generateContent({
          prompt: `${prompt}\n\nVariation ${i + 1}: Make this unique and engaging.`,
          provider,
          temperature: 0.7 + (i * 0.05),
        })
      );
    }
  }
  // Use mock data if no providers configured
  else {
    for (let i = 0; i < count; i++) {
      variations.push(
        generateContent({
          prompt,
          provider: 'google', // Will fallback to mock
          temperature: 0.7,
        })
      );
    }
  }
  
  return Promise.all(variations);
}