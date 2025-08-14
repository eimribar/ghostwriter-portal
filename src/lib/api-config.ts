// API Configuration
// Centralized configuration for all external APIs

console.log('[api-config] Loading environment variables...');
console.log('[api-config] VITE_GOOGLE_API_KEY exists:', !!import.meta.env.VITE_GOOGLE_API_KEY);
console.log('[api-config] First 10 chars:', import.meta.env.VITE_GOOGLE_API_KEY?.substring(0, 10));

export const apiConfig = {
  // AI Language Models
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    model: import.meta.env.VITE_GPT5_MODEL || 'gpt-5',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    // GPT-5 specific settings
    reasoningEffort: import.meta.env.VITE_GPT5_REASONING_EFFORT || 'medium',
    verbosity: import.meta.env.VITE_GPT5_VERBOSITY || 'high',
  },
  
  anthropic: {
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
    model: 'claude-3-opus-20240229',
    endpoint: 'https://api.anthropic.com/v1/messages',
  },
  
  google: {
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
    model: 'gemini-2.5-pro',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  },
  
  // Data Scraping
  apify: {
    apiToken: import.meta.env.VITE_APIFY_API_TOKEN || '',
    linkedinScraperActorId: 'apify/linkedin-profile-scraper',
    endpoint: 'https://api.apify.com/v2',
  },
  
  // Media Storage
  cloudinary: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
    apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || '',
    uploadPreset: 'ghostwriter-portal',
  },
};

// Check which APIs are configured
export const getConfiguredAPIs = () => {
  return {
    openai: !!apiConfig.openai.apiKey,
    anthropic: !!apiConfig.anthropic.apiKey,
    google: !!apiConfig.google.apiKey,
    apify: !!apiConfig.apify.apiToken,
    cloudinary: !!apiConfig.cloudinary.cloudName,
  };
};

// Get available LLM providers
export const getAvailableLLMs = () => {
  const available = [];
  if (apiConfig.openai.apiKey) available.push('gpt4');
  if (apiConfig.anthropic.apiKey) available.push('claude');
  if (apiConfig.google.apiKey) available.push('gemini');
  return available;
};