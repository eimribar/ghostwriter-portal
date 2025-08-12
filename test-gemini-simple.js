// Simplified test for Gemini API
const API_KEY = 'AIzaSyBf1vfywyUHLKs_SNAaiU1tvwhi2c0J7Ek';

async function testGeminiAPI() {
  console.log('Testing Gemini 2.5 Pro API with simple prompt...\n');

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Write a LinkedIn post about AI agents in the style of a tech startup founder. Make it engaging and insightful. Topic: AI agents',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            topK: 40,
            topP: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error:', response.status, errorData);
      return;
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      console.log('GENERATED LINKEDIN POST:');
      console.log('========================\n');
      console.log(data.candidates[0].content.parts[0].text);
      console.log('\n========================');
    } else {
      console.error('Response structure:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testGeminiAPI();