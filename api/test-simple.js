// Simple test to see GPT-5 response structure
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    if (!openaiKey) {
      return res.status(500).json({ error: 'No API key' });
    }

    // Simple request without web search to see response structure
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
              text: 'Return a JSON object with this exact structure: {"ideas": [{"title": "Test Idea", "description": "Test description"}]}'
            }]
          }
        ],
        temperature: 1,
        max_output_tokens: 500
      }),
    });

    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(200).json({ 
        error: 'Could not parse',
        raw: responseText 
      });
    }
    
    // Return the full structure so we can see it
    return res.status(200).json({ 
      success: true,
      responseKeys: Object.keys(data),
      hasContent: !!data.content,
      contentType: typeof data.content,
      contentLength: data.content ? data.content.length : 0,
      firstChars: data.content ? data.content.substring(0, 200) : null,
      fullResponse: data
    });

  } catch (error) {
    return res.status(500).json({ 
      error: error.message
    });
  }
}