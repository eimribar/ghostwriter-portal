// Direct test endpoint for GPT-5 API
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
    const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    if (!openaiKey) {
      return res.status(500).json({ 
        error: 'No OpenAI API key found',
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasViteOpenAI: !!process.env.VITE_OPENAI_API_KEY
      });
    }

    console.log('Testing GPT-5 API directly...');
    console.log('Key exists:', !!openaiKey);
    console.log('Key prefix:', openaiKey.substring(0, 20));

    // Test GPT-5 API
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
            role: 'user',
            content: [{
              type: 'input_text',
              text: 'find me the top 10 trending topics (news) with context related to b2b saas, ai and marketing. actual news from the past week'
            }]
          }
        ],
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
        reasoning: { effort: 'medium' },
        temperature: 1,
        max_completion_tokens: 8192
      }),
    });

    const responseText = await response.text();
    console.log('GPT-5 Response status:', response.status);
    console.log('GPT-5 Response:', responseText);

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'GPT-5 API error',
        status: response.status,
        details: responseText
      });
    }

    const data = JSON.parse(responseText);
    
    return res.status(200).json({ 
      success: true,
      message: 'GPT-5 API called successfully!',
      response: data
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
}