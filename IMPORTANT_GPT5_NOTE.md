# CRITICAL: GPT-5 MODEL INFORMATION

## GPT-5 EXISTS AND IS FULLY DOCUMENTED

### DO NOT CHANGE THE MODEL NAME
- The model name is: `gpt-5`
- This is CORRECT and WORKING
- GPT-5 is a real, existing model from OpenAI
- Full documentation is in GPT5_README.md

### THE MODEL IS NOT THE PROBLEM
- If API calls fail, it's NOT because of the model name
- Check the API key configuration instead
- Check network/authentication issues
- But NEVER change from gpt-5

### Model Variants Available:
- `gpt-5` - Main model
- `gpt-5-mini` - Smaller, faster variant
- `gpt-5-nano` - Smallest variant

## Current Configuration
```javascript
model: 'gpt-5' // THIS IS CORRECT - DO NOT CHANGE
```

## WORKING CONFIGURATION (August 14, 2025)

### Confirmed Working Parameters:
- **Endpoint**: `/v1/responses` (NOT `/v1/chat/completions`)
- **Temperature**: Must be `1` (GPT-5 only supports 1, not 0.8)
- **Max Tokens**: Use `max_completion_tokens` NOT `max_tokens`
- **Reasoning**: Use `reasoning.effort` NOT `reasoning_effort`
- **Web Search**: `tools: [{ type: "web_search" }]`
- **Processing Time**: 2-5 minutes for web search (this is normal)

### Successfully Retrieved Real News:
- Oracle/Google Gemini partnership
- $9B Oklahoma AI investment
- OpenX antitrust lawsuit
- And 7+ more real news items with URLs

## If You See Errors:
1. Check if API key is loaded (console: API Key exists: true/false)
2. Check Vercel environment variables
3. Check network connectivity
4. Check parameter names (see above)
5. But NEVER assume gpt-5 doesn't exist - IT DOES AND IT WORKS!