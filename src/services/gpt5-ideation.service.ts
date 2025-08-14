import { apiConfig } from '../lib/api-config';

// GPT-5 specific types
export interface GPT5IdeationRequest {
  prompt: string;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
  tools?: any[];
  temperature?: number;
}

export interface GPT5Response {
  output: any[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens?: number;
  };
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
}

// Tool definitions for GPT-5
const ideationTools = [
  {
    type: 'function',
    name: 'get_trending_topics',
    description: 'Fetches current trending topics on LinkedIn',
    parameters: {
      type: 'object',
      properties: {
        industry: { type: 'string', description: 'Industry to focus on' },
        timeframe: { 
          type: 'string', 
          enum: ['today', 'week', 'month'],
          description: 'Time period for trends'
        },
        limit: { 
          type: 'number', 
          description: 'Number of trends to return',
          default: 10
        }
      },
      required: ['industry'],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: 'analyze_competitor_content',
    description: 'Analyzes top-performing content from competitors',
    parameters: {
      type: 'object',
      properties: {
        competitors: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'List of competitor names or profiles'
        },
        analysis_depth: {
          type: 'string',
          enum: ['surface', 'detailed', 'comprehensive'],
          default: 'detailed'
        }
      },
      required: ['competitors'],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: 'expand_idea',
    description: 'Expands a basic idea into a comprehensive content plan',
    parameters: {
      type: 'object',
      properties: {
        idea: { type: 'string', description: 'The core idea to expand' },
        target_audience: { type: 'string', description: 'Target audience for the content' },
        content_type: { 
          type: 'string', 
          enum: ['thought-leadership', 'how-to', 'case-study', 'opinion', 'data-driven'],
          description: 'Type of content to generate'
        },
        desired_length: { 
          type: 'number',
          description: 'Approximate word count',
          default: 500
        }
      },
      required: ['idea'],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: 'generate_hooks',
    description: 'Generates viral hooks for content ideas',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The topic to create hooks for' },
        style: {
          type: 'string',
          enum: ['provocative', 'question', 'statistic', 'story', 'contrarian'],
          description: 'Style of hook to generate'
        },
        count: {
          type: 'number',
          description: 'Number of hooks to generate',
          default: 5
        }
      },
      required: ['topic'],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: 'predict_engagement',
    description: 'Predicts engagement potential for a content idea',
    parameters: {
      type: 'object',
      properties: {
        idea: { type: 'string', description: 'The content idea to analyze' },
        format: { type: 'string', description: 'Content format' },
        target_audience: { type: 'string', description: 'Target audience' }
      },
      required: ['idea'],
      additionalProperties: false
    },
    strict: true
  }
];

// System prompts for different ideation modes
const systemPrompts = {
  comprehensive: `You are a LinkedIn content strategist specializing in B2B thought leadership. 
Your goal is to identify, analyze, and develop content ideas that drive engagement 
and establish authority in the industry.

<capabilities>
- Trend analysis and prediction
- Competitor content analysis  
- Topic expansion and refinement
- Engagement potential scoring
- Content gap identification
</capabilities>

<process>
1. Capture: Collect ideas from multiple sources
2. Analyze: Evaluate virality potential and relevance
3. Expand: Develop comprehensive content plans
4. Organize: Group into content pillars
5. Prioritize: Score and rank by potential impact
</process>

<output_format>
Provide structured content ideas with:
- Hook/headline (attention-grabbing)
- Key insights (3-5 bullet points)
- Target audience segment
- Engagement prediction (1-10 score)
- Content format recommendation
- Optimal posting time
</output_format>`,

  quick: `Generate 5 LinkedIn content ideas quickly. Focus on proven formats and high-engagement topics.
Keep responses concise and actionable. Each idea should include:
- Catchy headline
- Brief description (1-2 sentences)
- Target audience
- Expected engagement level`,

  trend_focused: `Analyze current LinkedIn trends and generate content ideas based on what's gaining traction.
Focus on emerging topics, contrarian takes, and timely discussions.
Prioritize ideas that can ride existing momentum while adding unique perspective.`
};

// Mock tool implementations (these would call real APIs in production)
async function executeTool(toolName: string, args: any): Promise<any> {
  console.log(`Executing tool: ${toolName} with args:`, args);
  
  switch (toolName) {
    case 'get_trending_topics':
      return {
        trends: [
          { topic: 'AI in workplace productivity', engagement_rate: 8.5, growth: '+23%' },
          { topic: 'Remote work culture shifts', engagement_rate: 7.2, growth: '+15%' },
          { topic: 'Sustainable business practices', engagement_rate: 6.8, growth: '+18%' },
          { topic: 'Personal branding strategies', engagement_rate: 9.1, growth: '+31%' },
          { topic: 'Data-driven decision making', engagement_rate: 7.5, growth: '+12%' }
        ]
      };
    
    case 'analyze_competitor_content':
      return {
        top_performing: [
          { 
            competitor: args.competitors[0], 
            post: 'Why perfection kills innovation',
            engagement: 1245,
            format: 'personal story'
          },
          {
            competitor: args.competitors[0],
            post: '5 metrics that actually matter',
            engagement: 892,
            format: 'listicle'
          }
        ],
        content_gaps: ['Technical deep-dives', 'Customer success stories', 'Behind-the-scenes content']
      };
    
    case 'expand_idea':
      return {
        expanded_content: {
          hook: `Here's what nobody tells you about ${args.idea}...`,
          introduction: `In my 10 years of experience, I've learned that ${args.idea} is more nuanced than most people think.`,
          key_points: [
            'Start with the problem, not the solution',
            'Data beats opinions every time',
            'Small experiments lead to big insights',
            'Consistency trumps perfection',
            'Measure what matters, ignore the rest'
          ],
          conclusion: 'The key is to start small and iterate based on real feedback.',
          cta: 'What\'s your experience with this? Share in the comments.'
        }
      };
    
    case 'generate_hooks':
      const hooks = [];
      for (let i = 0; i < (args.count || 5); i++) {
        hooks.push(generateHookForStyle(args.topic, args.style || 'provocative'));
      }
      return { hooks };
    
    case 'predict_engagement':
      const score = Math.floor(Math.random() * 3) + 7; // 7-9 range
      return {
        engagement_score: score,
        factors: {
          positive: ['Timely topic', 'Clear value proposition', 'Actionable insights'],
          negative: ['Might be too technical for some', 'Requires context'],
          suggestions: ['Add personal story', 'Include data points', 'Use more emotional language']
        }
      };
    
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

function generateHookForStyle(topic: string, style: string): string {
  const templates = {
    provocative: [
      `${topic} is dead. Here's what's replacing it.`,
      `Stop doing ${topic} wrong. Do this instead.`,
      `The truth about ${topic} that nobody wants to admit`
    ],
    question: [
      `What if everything you know about ${topic} is wrong?`,
      `Why is nobody talking about ${topic}?`,
      `Is ${topic} the most underrated skill in 2024?`
    ],
    statistic: [
      `87% of professionals fail at ${topic}. Here's why.`,
      `${topic} increased our revenue by 234% in 6 months`,
      `Only 3% of companies get ${topic} right`
    ],
    story: [
      `${topic} cost me $50,000. Here's what I learned.`,
      `How ${topic} changed my entire career trajectory`,
      `I spent 1000 hours mastering ${topic}. Here's the summary.`
    ],
    contrarian: [
      `Everyone's wrong about ${topic}`,
      `${topic} is overrated. Here's what actually works.`,
      `Forget ${topic}. Focus on this instead.`
    ]
  };
  
  const styleTemplates = templates[style as keyof typeof templates] || templates.provocative;
  return styleTemplates[Math.floor(Math.random() * styleTemplates.length)];
}

// Main GPT-5 ideation service
export class GPT5IdeationService {
  private apiKey: string;
  private model: string;
  private defaultReasoningEffort: string;
  private defaultVerbosity: string;

  constructor() {
    this.apiKey = apiConfig.openai.apiKey;
    this.model = apiConfig.openai.model;
    this.defaultReasoningEffort = apiConfig.openai.reasoningEffort;
    this.defaultVerbosity = apiConfig.openai.verbosity;
  }

  // Check if GPT-5 is configured
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // Generate content ideas using GPT-5
  async generateIdeas(
    topic: string,
    options: {
      count?: number;
      mode?: 'comprehensive' | 'quick' | 'trend_focused';
      industry?: string;
      targetAudience?: string;
      useTools?: boolean;
    } = {}
  ): Promise<ContentIdeaGenerated[]> {
    if (!this.isConfigured()) {
      console.warn('GPT-5 not configured, returning mock ideas');
      return this.generateMockIdeas(topic, options.count || 5);
    }

    const {
      count = 5,
      mode = 'comprehensive',
      industry = 'technology',
      targetAudience = 'B2B professionals',
      useTools = true
    } = options;

    try {
      const systemPrompt = systemPrompts[mode];
      const userPrompt = `Generate ${count} LinkedIn content ideas about "${topic}" for ${targetAudience} in the ${industry} industry.
      
Focus on:
- High engagement potential
- Unique perspectives
- Actionable insights
- Current trends and discussions

For each idea provide:
1. Title
2. Description
3. Hook
4. Category
5. Target audience
6. Content format
7. Key points (3-5)
8. Engagement score (1-10)
9. Tags
10. LinkedIn style recommendation`;

      // For now, use the standard OpenAI API until GPT-5 is released
      // This will be updated to use the new Responses API when available
      const response = await this.callOpenAI(
        systemPrompt,
        userPrompt,
        useTools ? ideationTools : undefined
      );

      // Parse the response into structured ideas
      return this.parseIdeasFromResponse(response);
    } catch (error) {
      console.error('Error generating ideas with GPT-5:', error);
      return this.generateMockIdeas(topic, count);
    }
  }

  // Call OpenAI API (will be updated for GPT-5 Responses API)
  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    tools?: any[]
  ): Promise<any> {
    const requestBody: any = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 4000
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Handle tool calls if present
    if (data.choices[0].message.tool_calls) {
      const toolResults = await this.handleToolCalls(data.choices[0].message.tool_calls);
      // Make another call with tool results
      return this.callOpenAIWithToolResults(
        systemPrompt,
        userPrompt,
        data.choices[0].message,
        toolResults
      );
    }

    return data.choices[0].message.content;
  }

  // Handle tool calls from GPT-5
  private async handleToolCalls(toolCalls: any[]): Promise<any[]> {
    const results = [];
    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await executeTool(toolCall.function.name, args);
      results.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: toolCall.function.name,
        content: JSON.stringify(result)
      });
    }
    return results;
  }

  // Call OpenAI with tool results
  private async callOpenAIWithToolResults(
    systemPrompt: string,
    userPrompt: string,
    assistantMessage: any,
    toolResults: any[]
  ): Promise<any> {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
      assistantMessage,
      ...toolResults
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.8,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Parse GPT-5 response into structured ideas
  private parseIdeasFromResponse(response: string): ContentIdeaGenerated[] {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed.map(idea => this.normalizeIdea(idea));
      }
    } catch {
      // If not JSON, parse as text
      return this.parseTextResponse(response);
    }
    return [];
  }

  // Parse text response into ideas
  private parseTextResponse(response: string): ContentIdeaGenerated[] {
    const ideas: ContentIdeaGenerated[] = [];
    const sections = response.split(/\d+\.\s+/);
    
    for (const section of sections) {
      if (!section.trim()) continue;
      
      const idea: ContentIdeaGenerated = {
        title: this.extractField(section, 'Title') || 'Untitled Idea',
        description: this.extractField(section, 'Description') || '',
        hook: this.extractField(section, 'Hook') || '',
        category: this.extractField(section, 'Category') || 'General',
        targetAudience: this.extractField(section, 'Target') || 'Professionals',
        contentFormat: this.extractField(section, 'Format') || 'text',
        keyPoints: this.extractList(section, 'Key points') || [],
        engagementScore: parseInt(this.extractField(section, 'Engagement') || '7'),
        tags: this.extractList(section, 'Tags') || [],
        source: 'ai-generated',
        linkedInStyle: this.extractField(section, 'Style') || 'professional'
      };
      
      if (idea.title !== 'Untitled Idea') {
        ideas.push(idea);
      }
    }
    
    return ideas;
  }

  // Extract field from text
  private extractField(text: string, field: string): string | null {
    const regex = new RegExp(`${field}[:\\s]+(.+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  // Extract list from text
  private extractList(text: string, field: string): string[] {
    const fieldIndex = text.toLowerCase().indexOf(field.toLowerCase());
    if (fieldIndex === -1) return [];
    
    const afterField = text.substring(fieldIndex);
    const lines = afterField.split('\n');
    const items: string[] = [];
    
    for (const line of lines.slice(1)) {
      if (line.match(/^[-•*]\s+/)) {
        items.push(line.replace(/^[-•*]\s+/, '').trim());
      } else if (line.match(/^\d+\./)) {
        break;
      }
    }
    
    return items;
  }

  // Normalize idea structure
  private normalizeIdea(idea: any): ContentIdeaGenerated {
    return {
      title: idea.title || 'Untitled',
      description: idea.description || '',
      hook: idea.hook || '',
      category: idea.category || 'General',
      targetAudience: idea.targetAudience || idea.target_audience || 'Professionals',
      contentFormat: idea.contentFormat || idea.content_format || 'text',
      keyPoints: idea.keyPoints || idea.key_points || [],
      engagementScore: idea.engagementScore || idea.engagement_score || 7,
      tags: idea.tags || [],
      source: idea.source || 'ai-generated',
      linkedInStyle: idea.linkedInStyle || idea.linkedin_style || 'professional'
    };
  }

  // Generate mock ideas for testing
  private generateMockIdeas(topic: string, count: number): ContentIdeaGenerated[] {
    const ideas: ContentIdeaGenerated[] = [];
    const formats = ['thought-leadership', 'how-to', 'case-study', 'opinion', 'data-driven'];
    const categories = ['Technology', 'Leadership', 'Innovation', 'Strategy', 'Growth'];
    
    for (let i = 0; i < count; i++) {
      ideas.push({
        title: `${topic} - Idea ${i + 1}: Revolutionary approach to modern challenges`,
        description: `Explore how ${topic} is transforming the industry landscape and creating new opportunities for growth and innovation.`,
        hook: `What if everything you know about ${topic} is about to change?`,
        category: categories[i % categories.length],
        targetAudience: 'B2B Decision Makers',
        contentFormat: formats[i % formats.length],
        keyPoints: [
          'Start with the problem, not the solution',
          'Data-driven insights reveal hidden patterns',
          'Small experiments lead to breakthrough innovations',
          'Collaboration accelerates transformation',
          'Measure impact, not just activity'
        ],
        engagementScore: Math.floor(Math.random() * 3) + 7,
        tags: ['innovation', topic.toLowerCase().replace(/\s+/g, ''), 'strategy', 'growth'],
        source: 'ai-generated',
        linkedInStyle: 'thought-leadership'
      });
    }
    
    return ideas;
  }

  // Analyze existing ideas for patterns
  async analyzeIdeas(ideas: any[]): Promise<any> {
    if (!this.isConfigured()) {
      return {
        patterns: ['High engagement on contrarian takes', 'Personal stories perform well'],
        gaps: ['Technical deep-dives', 'Customer success stories'],
        recommendations: ['Focus on storytelling', 'Add more data points']
      };
    }

    const prompt = `Analyze these content ideas and identify:
1. Common patterns in high-performing content
2. Content gaps and opportunities
3. Recommendations for improvement

Ideas: ${JSON.stringify(ideas)}`;

    try {
      const response = await this.callOpenAI(systemPrompts.comprehensive, prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing ideas:', error);
      return {
        patterns: [],
        gaps: [],
        recommendations: []
      };
    }
  }

  // Expand a single idea into detailed content
  async expandIdea(
    idea: string,
    targetAudience: string = 'B2B professionals',
    contentType: string = 'thought-leadership'
  ): Promise<any> {
    if (!this.isConfigured()) {
      return this.generateMockExpandedIdea(idea, targetAudience, contentType);
    }

    const tools = [ideationTools.find(t => t.name === 'expand_idea')];
    
    try {
      const response = await this.callOpenAI(
        systemPrompts.comprehensive,
        `Expand this idea into a comprehensive LinkedIn post: "${idea}"
         Target audience: ${targetAudience}
         Content type: ${contentType}`,
        tools
      );
      
      return this.parseExpandedIdea(response);
    } catch (error) {
      console.error('Error expanding idea:', error);
      return this.generateMockExpandedIdea(idea, targetAudience, contentType);
    }
  }

  // Parse expanded idea response
  private parseExpandedIdea(response: string): any {
    try {
      return JSON.parse(response);
    } catch {
      return {
        title: this.extractField(response, 'Title') || 'Expanded Content',
        hook: this.extractField(response, 'Hook') || '',
        introduction: this.extractField(response, 'Introduction') || '',
        keyPoints: this.extractList(response, 'Key Points'),
        conclusion: this.extractField(response, 'Conclusion') || '',
        cta: this.extractField(response, 'Call to Action') || 'What are your thoughts?'
      };
    }
  }

  // Generate mock expanded idea
  private generateMockExpandedIdea(
    idea: string,
    targetAudience: string,
    contentType: string
  ): any {
    return {
      title: idea,
      hook: `Here's what nobody tells you about ${idea}...`,
      introduction: `After years of experience in this field, I've discovered that ${idea} is more complex and nuanced than most people realize.`,
      keyPoints: [
        'Start with clear objectives and measurable goals',
        'Build incrementally and validate assumptions',
        'Focus on value creation over feature development',
        'Measure impact and iterate based on data',
        'Scale what works, abandon what doesn\'t'
      ],
      examples: [
        'Company X increased revenue by 45% using this approach',
        'We reduced customer churn by 30% in 3 months',
        'This strategy saved us $500K in wasted development'
      ],
      conclusion: 'The key is to start small, measure everything, and scale what works.',
      cta: 'What\'s been your experience with this? Share your insights below.',
      hashtags: ['#Innovation', '#Strategy', '#Growth', '#Leadership'],
      estimatedReadTime: 3,
      targetAudience,
      contentType
    };
  }
}

// Export singleton instance
export const gpt5IdeationService = new GPT5IdeationService();