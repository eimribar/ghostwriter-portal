// Test with actual LinkedIn prompt template
import { readFileSync } from 'fs';

const API_KEY = 'AIzaSyBf1vfywyUHLKs_SNAaiU1tvwhi2c0J7Ek';

// Read the first LinkedIn prompt template from the file
const promptFile = readFileSync('./src/lib/linkedin-prompts.ts', 'utf8');
// Extract just the first template's system message
const startIndex = promptFile.indexOf('systemMessage: `') + 16;
const endIndex = promptFile.indexOf('`\n  },', startIndex);
const systemMessage = promptFile.substring(startIndex, endIndex);

async function testGeminiWithLinkedInPrompt() {
  console.log('Testing Gemini 2.5 Pro with LinkedIn RevOps template...\n');
  console.log('Topic: "ai agents"\n');
  console.log('---\n');

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
                  text: systemMessage + '\n\nContent idea: ai agents',
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
      console.log('GENERATED LINKEDIN POST (RevOps Style):');
      console.log('=========================================\n');
      console.log(data.candidates[0].content.parts[0].text);
      console.log('\n=========================================');
      console.log('\nTokens used:', data.usageMetadata.totalTokenCount);
    } else {
      console.error('No content in response');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testGeminiWithLinkedInPrompt();