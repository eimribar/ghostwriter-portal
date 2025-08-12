export interface PromptTemplate {
  id: string;
  name: string;
  category: 'hook' | 'body' | 'cta' | 'full' | 'ideation' | 'optimization';
  template_text: string;
  variables: Record<string, string>;
  performance_score?: number;
  usage_count: number;
  client_specific?: string;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PromptVariable {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

// Advanced prompt templates for different content types
export const defaultPromptTemplates: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>[] = [
  // HOOKS - Attention-grabbing openers
  {
    name: 'Controversial Opinion Hook',
    category: 'hook',
    template_text: `Unpopular opinion: {controversial_statement}

But here's why I believe it's true...`,
    variables: {
      controversial_statement: 'Your controversial take that challenges common beliefs'
    },
    performance_score: 0.92,
    usage_count: 0,
    is_active: true,
  },
  {
    name: 'Personal Transformation Hook',
    category: 'hook',
    template_text: `{time_period} ago, I {past_situation}.

Today, {current_situation}.

Here's what changed:`,
    variables: {
      time_period: 'X years/months',
      past_situation: 'struggled with/couldn\'t/didn\'t understand',
      current_situation: 'I successfully/confidently/easily'
    },
    performance_score: 0.88,
    usage_count: 0,
    is_active: true,
  },
  {
    name: 'Pattern Interrupt Hook',
    category: 'hook',
    template_text: `Everyone's talking about {popular_topic}.

But they're missing {overlooked_aspect}.

Let me explain:`,
    variables: {
      popular_topic: 'the trending topic everyone discusses',
      overlooked_aspect: 'the critical element being ignored'
    },
    performance_score: 0.85,
    usage_count: 0,
    is_active: true,
  },
  {
    name: 'Data-Driven Hook',
    category: 'hook',
    template_text: `{statistic} of {demographic} {action_or_belief}.

That's {adjective}.

But what's even more {adjective} is {insight}.`,
    variables: {
      statistic: '87%',
      demographic: 'founders/marketers/leaders',
      action_or_belief: 'fail at/believe/struggle with',
      adjective: 'shocking/surprising/remarkable',
      insight: 'the real reason why'
    },
    performance_score: 0.87,
    usage_count: 0,
    is_active: true,
  },

  // BODY - Main content structures
  {
    name: 'Numbered Insights',
    category: 'body',
    template_text: `{number} {item_type} that {benefit}:

{list_items}

Which one resonates most with you?`,
    variables: {
      number: '5',
      item_type: 'strategies/lessons/mistakes/insights',
      benefit: 'transformed my approach/changed everything/made the difference',
      list_items: '1. First insight with brief explanation\n2. Second insight...\n3. Third insight...'
    },
    performance_score: 0.90,
    usage_count: 0,
    is_active: true,
  },
  {
    name: 'Problem-Agitate-Solution',
    category: 'body',
    template_text: `The problem: {problem_description}

Most people try {common_solution}.

But that {why_it_fails}.

Instead, {better_solution}.

Here's how: {implementation_steps}`,
    variables: {
      problem_description: 'describe the core problem',
      common_solution: 'the typical approach people take',
      why_it_fails: 'doesn\'t work because/leads to/causes',
      better_solution: 'do this instead',
      implementation_steps: 'step-by-step guide'
    },
    performance_score: 0.89,
    usage_count: 0,
    is_active: true,
  },
  {
    name: 'Case Study Structure',
    category: 'body',
    template_text: `The situation: {initial_context}

The challenge: {main_obstacle}

The approach: {solution_method}

The result: {outcome_metrics}

Key takeaway: {main_lesson}`,
    variables: {
      initial_context: 'Company X was facing...',
      main_obstacle: 'They couldn\'t figure out how to...',
      solution_method: 'We implemented a system that...',
      outcome_metrics: '150% increase in.../3x improvement...',
      main_lesson: 'The lesson for you is...'
    },
    performance_score: 0.86,
    usage_count: 0,
    is_active: true,
  },
  {
    name: 'Myth Buster',
    category: 'body',
    template_text: `Myth: {common_myth}

Reality: {actual_truth}

Why people believe the myth: {reason_for_misconception}

What actually works: {correct_approach}

Proof: {evidence_or_example}`,
    variables: {
      common_myth: 'You need X to succeed at Y',
      actual_truth: 'The opposite is true',
      reason_for_misconception: 'It seems logical because...',
      correct_approach: 'Focus on this instead',
      evidence_or_example: 'I\'ve seen this work with...'
    },
    performance_score: 0.84,
    usage_count: 0,
    is_active: true,
  },

  // CTA - Call to actions
  {
    name: 'Engagement Question CTA',
    category: 'cta',
    template_text: `What's your experience with {topic}?

{specific_question}

Share your thoughts below 👇

{hashtags}`,
    variables: {
      topic: 'this challenge/approach/strategy',
      specific_question: 'Have you tried.../What worked for you?',
      hashtags: '#YourHashtags #Topics'
    },
    performance_score: 0.91,
    usage_count: 0,
    is_active: true,
  },
  {
    name: 'Value-Add CTA',
    category: 'cta',
    template_text: `Found this valuable?

{action_request}

And if you're facing {related_challenge}, {helpful_resource}.

{connection_invitation}`,
    variables: {
      action_request: 'Save it for later/Share with someone who needs it',
      related_challenge: 'similar issues with X',
      helpful_resource: 'I wrote about solutions here [link]',
      connection_invitation: 'Let\'s connect and discuss'
    },
    performance_score: 0.83,
    usage_count: 0,
    is_active: true,
  },

  // FULL - Complete post templates
  {
    name: 'Thought Leadership Post',
    category: 'full',
    template_text: `{hook}

Here's what most people don't understand about {topic}:

{key_insight}

{supporting_points}

The shift happens when you realize: {paradigm_shift}

{personal_example}

{cta_question}

{hashtags}`,
    variables: {
      hook: 'Your attention-grabbing opener',
      topic: 'leadership/growth/innovation',
      key_insight: 'The counterintuitive truth',
      supporting_points: '→ Point 1\n→ Point 2\n→ Point 3',
      paradigm_shift: 'The mindset change needed',
      personal_example: 'Last week, I saw this play out when...',
      cta_question: 'What\'s your take on this?',
      hashtags: '#Leadership #Innovation'
    },
    performance_score: 0.93,
    usage_count: 0,
    is_active: true,
  },
  {
    name: 'Educational Thread',
    category: 'full',
    template_text: `How to {achieve_outcome} (a thread):

1/ {first_principle}

{first_explanation}

2/ {second_principle}

{second_explanation}

3/ {third_principle}

{third_explanation}

The key is {main_takeaway}.

Start with {first_action}.

{closing_encouragement}

{hashtags}`,
    variables: {
      achieve_outcome: 'build a successful X/master Y',
      first_principle: 'Start with the foundation',
      first_explanation: 'This means you need to...',
      second_principle: 'Build momentum',
      second_explanation: 'Once you have X, focus on...',
      third_principle: 'Scale strategically',
      third_explanation: 'Now you can expand by...',
      main_takeaway: 'consistency over perfection',
      first_action: 'this simple step today',
      closing_encouragement: 'You\'ve got this!',
      hashtags: '#HowTo #Education'
    },
    performance_score: 0.88,
    usage_count: 0,
    is_active: true,
  },

  // IDEATION - Content idea generation
  {
    name: 'Topic Explorer',
    category: 'ideation',
    template_text: `Generate content ideas about {main_topic} for {target_audience}.

Focus areas:
- {focus_area_1}
- {focus_area_2}
- {focus_area_3}

Content style: {content_style}
Tone: {tone}
Goal: {content_goal}`,
    variables: {
      main_topic: 'AI in business',
      target_audience: 'startup founders',
      focus_area_1: 'practical applications',
      focus_area_2: 'common mistakes',
      focus_area_3: 'future trends',
      content_style: 'educational/inspirational/analytical',
      tone: 'professional yet approachable',
      content_goal: 'drive engagement and establish authority'
    },
    performance_score: 0.85,
    usage_count: 0,
    is_active: true,
  },

  // OPTIMIZATION - Content improvement
  {
    name: 'Content Enhancer',
    category: 'optimization',
    template_text: `Improve this content:

"{original_content}"

Optimization goals:
- {goal_1}
- {goal_2}
- {goal_3}

Target metrics: {metrics}
Maintain: {preserve_elements}
Remove: {remove_elements}`,
    variables: {
      original_content: 'Paste your draft content here',
      goal_1: 'Increase engagement',
      goal_2: 'Clarify message',
      goal_3: 'Add credibility',
      metrics: 'comments and shares',
      preserve_elements: 'core message and tone',
      remove_elements: 'jargon and fluff'
    },
    performance_score: 0.82,
    usage_count: 0,
    is_active: true,
  },
];

// Service class for managing prompt templates
export class PromptsService {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    // Initialize with default templates
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates() {
    defaultPromptTemplates.forEach(template => {
      const id = crypto.randomUUID();
      this.templates.set(id, {
        ...template,
        id,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });
  }

  // Get all templates
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  // Get templates by category
  getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  // Get active templates only
  getActiveTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.is_active);
  }

  // Get template by ID
  getTemplateById(id: string): PromptTemplate | null {
    return this.templates.get(id) || null;
  }

  // Get top performing templates
  getTopPerformingTemplates(limit = 5): PromptTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.is_active && t.performance_score)
      .sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))
      .slice(0, limit);
  }

  // Get client-specific templates
  getClientTemplates(clientId: string): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.client_specific === clientId
    );
  }

  // Fill template with variables
  fillTemplate(templateId: string, values: Record<string, string>): string | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    let filledText = template.template_text;
    
    // Replace all variables with their values
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      filledText = filledText.replace(regex, value);
    });

    // Update usage count
    template.usage_count++;
    template.updated_at = new Date();

    return filledText;
  }

  // Extract variables from template
  extractVariables(templateId: string): PromptVariable[] {
    const template = this.templates.get(templateId);
    if (!template) return [];

    const variables: PromptVariable[] = [];
    const regex = /\{([^}]+)\}/g;
    const matches = new Set<string>();
    
    let match;
    while ((match = regex.exec(template.template_text)) !== null) {
      matches.add(match[1]);
    }

    matches.forEach(key => {
      const description = template.variables[key] || '';
      variables.push({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: description.length > 50 ? 'textarea' : 'text',
        placeholder: description,
        required: true,
      });
    });

    return variables;
  }

  // Create custom template
  createTemplate(template: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>): PromptTemplate {
    const id = crypto.randomUUID();
    const newTemplate: PromptTemplate = {
      ...template,
      id,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  // Update template
  updateTemplate(id: string, updates: Partial<PromptTemplate>): PromptTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const updatedTemplate = {
      ...template,
      ...updates,
      id: template.id, // Ensure ID doesn't change
      updated_at: new Date(),
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  // Delete template
  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  // Toggle template active status
  toggleTemplateStatus(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    template.is_active = !template.is_active;
    template.updated_at = new Date();
    return true;
  }

  // Update performance score based on engagement
  updatePerformanceScore(id: string, engagementRate: number): void {
    const template = this.templates.get(id);
    if (!template) return;

    // Simple weighted average: new score = (old * usage + new) / (usage + 1)
    const currentScore = template.performance_score || 0;
    const newScore = (currentScore * template.usage_count + engagementRate) / (template.usage_count + 1);
    
    template.performance_score = Math.min(1, Math.max(0, newScore)); // Clamp between 0 and 1
    template.updated_at = new Date();
  }

  // Generate prompt combinations
  generatePromptCombination(
    hookId: string,
    bodyId: string,
    ctaId: string,
    values: Record<string, string>
  ): string | null {
    const hook = this.fillTemplate(hookId, values);
    const body = this.fillTemplate(bodyId, values);
    const cta = this.fillTemplate(ctaId, values);

    if (!hook || !body || !cta) return null;

    return `${hook}\n\n${body}\n\n${cta}`;
  }

  // Get recommended templates based on topic
  getRecommendedTemplates(topic: string, limit = 3): PromptTemplate[] {
    // Simple keyword matching - in production, use more sophisticated matching
    const keywords = topic.toLowerCase().split(' ');
    
    const scored = Array.from(this.templates.values())
      .filter(t => t.is_active)
      .map(template => {
        const text = `${template.name} ${template.template_text}`.toLowerCase();
        const score = keywords.reduce((acc, keyword) => {
          return acc + (text.includes(keyword) ? 1 : 0);
        }, 0);
        
        return { template, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => {
        // Sort by relevance score, then by performance
        if (b.score !== a.score) return b.score - a.score;
        return (b.template.performance_score || 0) - (a.template.performance_score || 0);
      });

    return scored.slice(0, limit).map(item => item.template);
  }
}

// Export singleton instance
export const promptsService = new PromptsService();