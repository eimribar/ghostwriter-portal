# Google Gemini API Configuration Guide

## Overview

This guide documents the Google Gemini API integration in the Ghostwriter Portal. The application uses **Google Gemini 2.5 Pro** exclusively with over 1 million token capacity and Google Grounding enabled by default.

## Table of Contents
- [Configuration](#configuration)
- [Model Settings](#model-settings)
- [Google Grounding](#google-grounding)
- [API Implementation](#api-implementation)
- [Manual Controls](#manual-controls)
- [Troubleshooting](#troubleshooting)

## Configuration

### Getting Your API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Choose your Google Cloud project (or create a new one)
4. Copy the API key

### Setting Up Environment Variables

Add to your `.env.local` file:

```bash
# Required: Google Gemini API Key
VITE_GOOGLE_API_KEY=your_api_key_here

# Optional: Control Google Grounding (defaults to true)
VITE_ENABLE_GOOGLE_GROUNDING=true
```

### API Key Security

- **Never commit API keys to Git**
- Add HTTP referrer restrictions in Google Cloud Console
- For production, use Vercel environment variables
- Rotate keys regularly

## Model Settings

### Current Configuration

The application is configured to use **Gemini 2.5 Pro** with these settings:

```javascript
{
  model: "gemini-2.5-pro",
  generationConfig: {
    temperature: 1.5,        // High creativity for content generation
    topK: 40,               // Consider top 40 tokens
    topP: 0.95,             // Nucleus sampling threshold
    maxOutputTokens: 1048576 // Over 1 million tokens
  }
}
```

### Token Limits

- **Maximum Input + Output**: 1,048,576 tokens (over 1 million)
- **Why this matters**: Allows for extensive context and long-form content
- **Typical usage**: LinkedIn posts use ~500-2000 tokens
- **Headroom**: Massive capacity for future features

## Google Grounding

### What is Google Grounding?

Google Grounding connects Gemini to real-time web content, allowing it to:
- Access information beyond its training cutoff
- Verify facts against current data
- Reduce hallucinations
- Provide citations for claims

### How It Works

1. **User Prompt**: Sent to Gemini API
2. **Prompt Analysis**: Model determines if web search would help
3. **Google Search**: Automatically executes relevant searches
4. **Information Synthesis**: Combines search results with model knowledge
5. **Grounded Response**: Returns factually accurate, up-to-date content

### Implementation

Google Grounding is implemented in `src/lib/llm-service.ts`:

```javascript
const requestBody = {
  contents: [...],
  generationConfig: {...},
  tools: [
    {
      google_search: {}  // Enables Google Grounding
    }
  ]
};
```

### Benefits for Content Generation

- **Current Events**: Reference recent news and trends
- **Accurate Statistics**: Pull latest data and figures
- **Company Information**: Get current details about businesses
- **Industry Trends**: Access real-time market insights
- **Fact Checking**: Verify claims automatically

### Response Structure with Grounding

When grounding is active, responses include:

```javascript
{
  candidates: [{
    content: { parts: [{ text: "..." }] },
    groundingMetadata: {
      webSearchQueries: ["queries used"],
      groundingChunks: [{ web: { uri: "...", title: "..." }}],
      groundingSupports: [{ segment: {...}, groundingChunkIndices: [...] }]
    }
  }]
}
```

## API Implementation

### File Structure

- **Configuration**: `src/lib/api-config.ts`
- **LLM Service**: `src/lib/llm-service.ts`
- **Prompt Templates**: `src/lib/linkedin-prompts.ts`

### Making API Calls

The main function for content generation:

```javascript
async function callGoogle(
  prompt: string, 
  temperature = 1.5, 
  maxTokens = 1048576, 
  systemMessage?: string
): Promise<GenerateContentResponse>
```

### LinkedIn Content Generation

For LinkedIn posts, the system:
1. Takes a content idea from the user
2. Applies one of 4 prompt templates
3. Sends to Gemini with system instructions
4. Returns grounded, factual content

Example usage:
```javascript
const variations = await generateLinkedInVariations(
  "How AI is transforming B2B sales",
  4  // Generate 4 variations
);
```

## Manual Controls

### Enabling/Disabling Google Grounding

While Google Grounding is enabled by default, you can control it:

#### Method 1: Environment Variable
```bash
# In .env.local
VITE_ENABLE_GOOGLE_GROUNDING=false  # Disables grounding
```

#### Method 2: Code Modification
In `src/lib/llm-service.ts`, modify the `callGoogle` function:

```javascript
// To disable grounding temporarily:
const requestBody = {
  contents: [...],
  generationConfig: {...},
  // Comment out or remove the tools section
  // tools: [{ google_search: {} }]
};
```

### Adjusting Token Limits

To modify token limits, update in two places:

1. **API calls** (`src/lib/llm-service.ts`):
```javascript
maxOutputTokens: 1048576  // Change this value
```

2. **Prompt defaults** (`src/pages/Prompts.tsx`):
```javascript
settings: {
  max_tokens: 1048576  // Change this value
}
```

### Temperature Control

Adjust creativity/randomness (0.0 to 2.0):
- **1.5** (current): High creativity for varied content
- **1.0**: Balanced creativity and consistency
- **0.5**: More predictable, focused responses
- **0.1**: Very deterministic, minimal variation

## Troubleshooting

### Common Issues

#### 1. API Key Not Working
- **Check**: Is the key active in Google Cloud Console?
- **Fix**: Regenerate key and update `.env.local`

#### 2. Rate Limiting
- **Symptom**: 429 errors
- **Fix**: Implement exponential backoff
- **Note**: Gemini Pro has generous limits (60 RPM)

#### 3. Grounding Not Working
- **Check**: Look for `groundingMetadata` in responses
- **Fix**: Ensure `tools: [{ google_search: {} }]` is present

#### 4. Token Limit Errors
- **Symptom**: "Token limit exceeded" errors
- **Fix**: Reduce `maxOutputTokens` or split content

#### 5. No Content Generated
- **Check**: Browser console for API errors
- **Fix**: Verify API key and network connectivity

### Debug Mode

Enable detailed logging by adding to any API call:

```javascript
console.log('Gemini Request:', JSON.stringify(requestBody, null, 2));
console.log('Gemini Response:', JSON.stringify(response, null, 2));
```

### API Status Check

Test your API key:
```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent" \
  -H "x-goog-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents": [{"parts": [{"text": "Hello"}]}]}'
```

## Best Practices

1. **Always use environment variables** for API keys
2. **Monitor usage** in Google Cloud Console
3. **Implement error handling** for API failures
4. **Cache responses** when appropriate
5. **Use grounding** for factual content
6. **Test prompts** in Google AI Studio first

## Pricing

- **Free Tier**: 60 queries per minute
- **Paid Tier**: Pay-as-you-go after free tier
- **Grounding**: Included in API pricing
- **Monitor costs**: Google Cloud Console → Billing

## Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://makersuite.google.com/)
- [Grounding Documentation](https://ai.google.dev/docs/grounding)
- [API Pricing](https://ai.google.dev/pricing)
- [Model Capabilities](https://ai.google.dev/models/gemini)

## Support

For issues specific to this implementation:
1. Check browser console for errors
2. Verify environment variables
3. Test API key separately
4. Review this guide's troubleshooting section

---

**Last Updated**: December 14, 2024
**Model Version**: Gemini 2.5 Pro
**Max Tokens**: 1,048,576
**Google Grounding**: Enabled by default