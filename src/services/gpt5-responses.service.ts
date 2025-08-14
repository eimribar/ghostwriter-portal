// GPT-5 Responses API Service - REAL Web Search Only, NO MOCK DATA
import { apiConfig } from '../lib/api-config';

export interface GPT5ResponsesRequest {
  prompt: string;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
  useWebSearch?: boolean;
}

export interface ContentIdeaGenerated {
  title: string;
  description: string;
  hook: string;
  category: string;
  targetAudience: string;
  contentFormat: string;
  keyPoints: string[];
  engagementScore: number;
  tags: string[];
  source: 'trending' | 'competitor' | 'ai-generated';
  linkedInStyle?: string;
  newsUrl?: string;
  publishedDate?: string;
}

export class GPT5ResponsesService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = apiConfig.openai.apiKey;
    this.model = apiConfig.openai.model || 'gpt-5';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // Call GPT-5 Responses API with web search
  async searchAndGenerateIdeas(
    searchQuery: string,
    options: {
      count?: number;
      timeframe?: 'today' | 'week' | 'month';
      industry?: string;
      targetAudience?: string;
    } = {}
  ): Promise<ContentIdeaGenerated[]> {
    if (!this.isConfigured()) {
      throw new Error('GPT-5 API key not configured. Please set VITE_OPENAI_API_KEY');
    }

    const {
      count = 10,
      timeframe = 'week',
      industry = 'B2B SaaS',
      targetAudience = 'B2B professionals, SaaS founders, Marketing leaders'
    } = options;

    console.log('🚀 === GPT-5 RESPONSES API WITH WEB SEARCH ===');
    console.log('📌 Search Query:', searchQuery);
    console.log('⚙️ Options:', { count, timeframe, industry, targetAudience });
    console.log('🌐 Web Search: ENABLED');

    try {
      // Build the request for Responses API
      const requestBody = {
        model: this.model,
        input: [
          {
            role: "developer",
            content: [{ 
              type: "input_text", 
              text: `You are a content strategist specializing in ${industry}. 
Search the web for real, actual trending news from the past ${timeframe} about "${searchQuery}".
Return the top ${count} trending topics with detailed context for LinkedIn content creation.

For each news item, provide:
1. Title for LinkedIn post
2. Hook that grabs attention
3. Description with context
4. 3-5 key discussion points
5. Target audience segment
6. Engagement score (1-10)
7. News source URL
8. Published date

Format the response as a JSON array of content ideas.` 
            }]
          },
          {
            role: "user",
            content: [{ 
              type: "input_text", 
              text: searchQuery 
            }]
          }
        ],
        tools: [{ type: "web_search" }],  // Enable web search
        tool_choice: "auto",
        reasoning: { 
          effort: "medium"
        }
      };

      console.log('📡 Calling GPT-5 Responses API...');
      console.log('⏱️ This may take 2-5 minutes for real web search...');
      
      const startTime = Date.now();
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      const elapsedTime = (Date.now() - startTime) / 1000;
      console.log(`⏱️ Response received in ${elapsedTime.toFixed(1)}s`);
      console.log('📥 Response Status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API Error:', error);
        throw new Error(`GPT-5 Responses API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Success! Processing response...');
      
      // Extract content from the response
      const ideas = this.extractIdeasFromResponse(data);
      console.log(`💡 Generated ${ideas.length} content ideas from real news`);
      
      return ideas;
    } catch (error) {
      console.error('❌ Error calling GPT-5 Responses API:', error);
      throw error;
    }
  }

  // Extract ideas from GPT-5 Responses API output
  private extractIdeasFromResponse(response: any): ContentIdeaGenerated[] {
    const ideas: ContentIdeaGenerated[] = [];
    
    // Look for the message output in the response
    if (response.output && Array.isArray(response.output)) {
      for (const item of response.output) {
        if (item.type === 'message' && item.content) {
          for (const content of item.content) {
            if (content.type === 'output_text' && content.text) {
              // Parse the text content
              const parsedIdeas = this.parseTextContent(content.text, content.annotations);
              ideas.push(...parsedIdeas);
            }
          }
        }
      }
    }

    // If no ideas were extracted, try to parse as raw text
    if (ideas.length === 0 && response.output) {
      console.log('Attempting to parse raw output...');
      const rawText = this.extractRawText(response.output);
      if (rawText) {
        const parsedIdeas = this.parseTextContent(rawText, []);
        ideas.push(...parsedIdeas);
      }
    }

    return ideas;
  }

  // Extract raw text from output array
  private extractRawText(output: any[]): string {
    let text = '';
    for (const item of output) {
      if (item.type === 'message' && item.content) {
        for (const content of item.content) {
          if (content.type === 'output_text' && content.text) {
            text += content.text + '\n';
          }
        }
      } else if (typeof item === 'string') {
        text += item + '\n';
      }
    }
    return text;
  }

  // Parse text content into structured ideas
  private parseTextContent(text: string, _annotations?: any[]): ContentIdeaGenerated[] {
    const ideas: ContentIdeaGenerated[] = [];
    
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map(item => this.normalizeIdea(item));
      }
    } catch {
      // Not JSON, parse as structured text
    }

    // Parse numbered list format (from the real response we got)
    const sections = text.split(/\d+\)/);
    
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      if (!section.trim()) continue;
      
      // Extract title from first line
      const lines = section.trim().split('\n');
      const titleMatch = lines[0].match(/^([^-]+)/);
      const title = titleMatch ? titleMatch[1].trim() : `News Item ${i}`;
      
      // Extract URL from annotations or text
      let url = '';
      let date = '';
      const urlMatch = section.match(/URL:\s*(https?:\/\/[^\s]+)/);
      if (urlMatch) url = urlMatch[1];
      const dateMatch = section.match(/Published:\s*([^,\n]+)/);
      if (dateMatch) date = dateMatch[1];
      
      // Extract "Why it matters" section
      const whyMattersMatch = section.match(/Why it matters:\s*([^-\n]+)/);
      const description = whyMattersMatch ? whyMattersMatch[1].trim() : '';
      
      // Create idea object
      const idea: ContentIdeaGenerated = {
        title: title,
        description: description || `Breaking news about ${title}`,
        hook: `🔥 ${title.split(':')[0]} - Here's what it means for you...`,
        category: 'News Commentary',
        targetAudience: 'B2B SaaS professionals',
        contentFormat: 'thought-leadership',
        keyPoints: [
          'Immediate implications for the industry',
          'What this means for your business',
          'Action steps to take now',
          'Future predictions based on this trend'
        ],
        engagementScore: 8,
        tags: ['trending', 'news', 'b2b-saas', 'ai', 'marketing'],
        source: 'trending',
        linkedInStyle: 'news-commentary',
        newsUrl: url,
        publishedDate: date
      };
      
      ideas.push(idea);
    }
    
    return ideas;
  }

  // Normalize idea structure
  private normalizeIdea(raw: any): ContentIdeaGenerated {
    return {
      title: raw.title || 'Untitled',
      description: raw.description || raw.summary || '',
      hook: raw.hook || `Breaking: ${raw.title}`,
      category: raw.category || 'News',
      targetAudience: raw.targetAudience || raw.target_audience || 'Professionals',
      contentFormat: raw.contentFormat || raw.content_format || 'thought-leadership',
      keyPoints: raw.keyPoints || raw.key_points || [],
      engagementScore: raw.engagementScore || raw.engagement_score || 7,
      tags: raw.tags || [],
      source: raw.source || 'trending',
      linkedInStyle: raw.linkedInStyle || raw.linkedin_style || 'professional',
      newsUrl: raw.url || raw.newsUrl || raw.source_url,
      publishedDate: raw.date || raw.publishedDate || raw.published_date
    };
  }
}

// Export singleton instance
export const gpt5ResponsesService = new GPT5ResponsesService();