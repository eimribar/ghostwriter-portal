# GPT-5 Integration Documentation

## Overview

This document details the GPT-5 integration in the Ghostwriter Portal, specifically the implementation of the GPT-5 Responses API with web search capabilities for content ideation.

## Key Features

### 1. Real Web Search
- **Endpoint**: `/v1/responses` (NOT `/v1/chat/completions`)
- **Tool Configuration**: `tools: [{ type: "web_search" }]`
- **Processing Time**: 2-5 minutes for comprehensive web search
- **Returns**: Actual news articles with source URLs and publication dates

### 2. No Mock Data Policy
- All mock data functions have been removed
- System throws errors if API key is missing
- No fallback to mock data under any circumstances
- Only real API calls are made

## Implementation Details

### Service Architecture

#### `gpt5-responses.service.ts`
Primary service for GPT-5 Responses API integration:

```typescript
// Key configuration
const requestBody = {
  model: "gpt-5",
  input: [
    { role: "developer", content: [{ type: "input_text", text: "..." }] },
    { role: "user", content: [{ type: "input_text", text: "..." }] }
  ],
  tools: [{ type: "web_search" }],
  tool_choice: "auto",
  reasoning: { effort: "medium" }
};
```

#### Parameter Requirements (GPT-5 Specific)
- **Temperature**: Must be `1` (GPT-5 only supports temperature of 1)
- **Max Tokens**: Use `max_completion_tokens` NOT `max_tokens`
- **Reasoning**: Use `reasoning.effort` NOT `reasoning_effort`
- **Text Format**: Do NOT include `text.type` or `text.format`

### Environment Configuration

Required environment variables:
```bash
VITE_OPENAI_API_KEY=your_openai_api_key  # Required for GPT-5
VITE_GPT5_MODEL=gpt-5                    # Model name (default: gpt-5)
```

Optional search API fallbacks:
```bash
VITE_GOOGLE_SEARCH_API_KEY=    # Google Custom Search
VITE_BING_SEARCH_API_KEY=      # Bing Search API
VITE_SERPAPI_KEY=              # SerpAPI
```

## Usage Examples

### Content Ideation Page

The Ideation page (`/ideation`) provides two main ways to use GPT-5:

#### 1. News & Trends Button
Uses the exact query:
```
"find me the top 10 trending topics (news) with context related to b2b saas, ai and marketing. actual news from the past week"
```

#### 2. AI Generation Modal
- Multiple modes: Comprehensive, Quick, Trend-focused, News-focused
- Custom topic input
- Industry and audience targeting

### API Response Structure

GPT-5 Responses API returns a complex structure:

```javascript
{
  id: "resp_...",
  output: [
    { type: "reasoning", summary: [] },
    { type: "web_search_call", action: { type: "search", query: "..." } },
    { type: "message", content: [{ type: "output_text", text: "..." }] }
  ],
  usage: {
    input_tokens: 1172388,
    output_tokens: 7503,
    reasoning_tokens: 5888
  }
}
```

## Real-World Results

Successfully tested on August 14, 2025, retrieving actual news:
1. Oracle will resell Google's Gemini models (Reuters)
2. Google $9B Oklahoma investment (Reuters)
3. US government "USAi" platform (Politico)
4. Ad agencies under AI pressure (Financial Times)
5. S4 Capital/MSQ Partners talks (WSJ)
6. OpenX antitrust suit against Google (Business Insider)
7. Cloudflare/Perplexity crawler dispute (Cloudflare blog)
8. Ads in Grok's AI answers (Adweek)
9. Google using Gemini for ad fraud (Adweek)
10. Profound raises $35M for AI search (Adweek)

## Common Issues & Solutions

### Issue: 400 Bad Request - "max_tokens not supported"
**Solution**: Use `max_completion_tokens` instead of `max_tokens`

### Issue: 400 Bad Request - "temperature 0.8 not supported"
**Solution**: GPT-5 only supports `temperature: 1`

### Issue: 400 Bad Request - "reasoning_effort unknown parameter"
**Solution**: Use `reasoning.effort` inside reasoning object

### Issue: 400 Bad Request - "text.type unknown parameter"
**Solution**: Remove text.type and text.format entirely

### Issue: Request times out after 2 minutes
**Solution**: This is normal. GPT-5 web search takes 2-5 minutes. Increase timeout to 600000ms (10 minutes)

## Testing

### Local Testing
```bash
# Start development server
npm run dev

# Navigate to http://localhost:5173/ideation
# Click "News & Trends" → "Generate from News"
# Wait 2-5 minutes for results
```

### Production Testing
1. Visit https://ghostwriter-portal.vercel.app/ideation
2. Click "News & Trends" button
3. Click "Generate from News"
4. Wait 2-5 minutes for real web search results

## Important Notes

1. **Processing Time**: Real web search takes 2-5 minutes. This is expected behavior.
2. **API Keys**: Never commit API keys to repository. Use environment variables only.
3. **No Mock Data**: The system will fail if API key is missing. This is intentional.
4. **Token Usage**: A single web search can use 1M+ tokens (mostly cached).
5. **Rate Limits**: Be aware of OpenAI rate limits when testing.

## Future Enhancements

- [ ] Add search result caching to reduce API calls
- [ ] Implement progress indicators during search
- [ ] Add custom search query builder UI
- [ ] Create scheduled news monitoring (daily/weekly)
- [ ] Add client-specific news filtering
- [ ] Implement news source preferences

## Support

For issues or questions about GPT-5 integration:
1. Check the error console for specific API error messages
2. Verify environment variables are set correctly
3. Ensure you have GPT-5 access on your OpenAI account
4. Review this documentation for parameter requirements

## References

- [OpenAI Responses API Documentation](https://platform.openai.com/docs/api-reference/responses)
- [GPT-5 Model Card](https://platform.openai.com/docs/models/gpt-5)
- [Web Search Tool Documentation](https://platform.openai.com/docs/tools/web-search)