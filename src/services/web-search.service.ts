// REAL Web Search Service - NO MOCK DATA

export interface WebSearchResult {
  title: string;
  snippet: string;
  link: string;
  displayLink: string;
  formattedUrl: string;
}

export class WebSearchService {
  private apiKey: string;

  constructor() {
    // Use Google Custom Search API or another real search API
    this.apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY || '';
  }

  // Real web search using Google Custom Search API
  async searchGoogle(query: string, limit: number = 10): Promise<WebSearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Google Search API key not configured');
    }

    const searchEngineId = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID || '';
    const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${limit}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.items) {
        return data.items.map((item: any) => ({
          title: item.title,
          snippet: item.snippet,
          link: item.link,
          displayLink: item.displayLink,
          formattedUrl: item.formattedUrl
        }));
      }
      return [];
    } catch (error) {
      console.error('Google Search API error:', error);
      throw error;
    }
  }

  // Alternative: Use Bing Search API
  async searchBing(query: string, limit: number = 10): Promise<WebSearchResult[]> {
    const bingApiKey = import.meta.env.VITE_BING_SEARCH_API_KEY || '';
    if (!bingApiKey) {
      throw new Error('Bing Search API key not configured');
    }

    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${limit}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': bingApiKey
        }
      });
      const data = await response.json();
      
      if (data.webPages?.value) {
        return data.webPages.value.map((item: any) => ({
          title: item.name,
          snippet: item.snippet,
          link: item.url,
          displayLink: item.displayUrl,
          formattedUrl: item.url
        }));
      }
      return [];
    } catch (error) {
      console.error('Bing Search API error:', error);
      throw error;
    }
  }

  // Use SerpAPI for comprehensive search results
  async searchSerpAPI(query: string, limit: number = 10): Promise<WebSearchResult[]> {
    const serpApiKey = import.meta.env.VITE_SERPAPI_KEY || '';
    if (!serpApiKey) {
      throw new Error('SerpAPI key not configured');
    }

    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=${limit}&engine=google`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.organic_results) {
        return data.organic_results.map((item: any) => ({
          title: item.title,
          snippet: item.snippet,
          link: item.link,
          displayLink: item.displayed_link,
          formattedUrl: item.link
        }));
      }
      return [];
    } catch (error) {
      console.error('SerpAPI error:', error);
      throw error;
    }
  }

  // Main search function - tries available APIs
  async search(query: string, limit: number = 10): Promise<WebSearchResult[]> {
    console.log('🔍 REAL WEB SEARCH for:', query);
    
    // Try Google first
    if (import.meta.env.VITE_GOOGLE_SEARCH_API_KEY) {
      try {
        return await this.searchGoogle(query, limit);
      } catch (error) {
        console.error('Google search failed, trying alternatives...', error);
      }
    }

    // Try Bing
    if (import.meta.env.VITE_BING_SEARCH_API_KEY) {
      try {
        return await this.searchBing(query, limit);
      } catch (error) {
        console.error('Bing search failed, trying alternatives...', error);
      }
    }

    // Try SerpAPI
    if (import.meta.env.VITE_SERPAPI_KEY) {
      try {
        return await this.searchSerpAPI(query, limit);
      } catch (error) {
        console.error('SerpAPI search failed', error);
      }
    }

    throw new Error('No search API configured. Please set VITE_GOOGLE_SEARCH_API_KEY, VITE_BING_SEARCH_API_KEY, or VITE_SERPAPI_KEY');
  }
}

export const webSearchService = new WebSearchService();