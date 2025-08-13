import { apifyService } from './apify.service';
import { generateContent } from '../lib/llm-service';
import { 
  clientsService, 
  generatedContentService,
  scheduledPostsService,
  creatorsService,
  contentPostsService,
  type Client,
} from './database.service';
import { promptsService } from './prompts.service';

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  client_id?: string; // null means applies to all
  trigger_type: 'schedule' | 'event' | 'condition';
  trigger_config: TriggerConfig;
  action_type: 'scrape' | 'generate' | 'approve' | 'publish' | 'notify';
  action_config: ActionConfig;
  is_active: boolean;
  last_run_at?: Date;
  next_run_at?: Date;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TriggerConfig {
  // For schedule triggers
  schedule?: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:MM format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  
  // For event triggers
  event?: {
    type: 'new_trending_post' | 'client_onboarded' | 'content_approved' | 'low_content_queue';
    threshold?: number;
  };
  
  // For condition triggers
  condition?: {
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  };
}

export interface ActionConfig {
  // For scrape actions
  scrape?: {
    sources: string[]; // LinkedIn URLs
    limit?: number;
    minQualityScore?: number;
  };
  
  // For generate actions
  generate?: {
    count: number;
    promptTemplateId?: string;
    useTopPerforming?: boolean;
  };
  
  // For approve actions
  approve?: {
    autoApproveThreshold?: number; // Quality score threshold
    requiresManualReview?: boolean;
  };
  
  // For publish actions
  publish?: {
    platform: 'linkedin' | 'twitter' | 'both';
    scheduleAhead?: number; // Hours ahead to schedule
  };
  
  // For notify actions
  notify?: {
    type: 'email' | 'in_app' | 'both';
    recipients?: string[];
    message?: string;
  };
}

export interface AutomationLog {
  id: string;
  rule_id: string;
  status: 'success' | 'failed' | 'partial';
  details?: any;
  error_message?: string;
  items_processed?: number;
  execution_time_ms?: number;
  created_at: Date;
}

class AutomationService {
  private rules: Map<string, AutomationRule> = new Map();
  private activeTimers: Map<string, NodeJS.Timer> = new Map();
  private executionQueue: Set<string> = new Set();

  constructor() {
    this.initializeDefaultRules();
    this.startAutomationEngine();
  }

  private initializeDefaultRules() {
    // Default automation rules
    const defaultRules: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        name: 'Daily Content Scraping',
        description: 'Scrape trending content from top creators daily',
        trigger_type: 'schedule',
        trigger_config: {
          schedule: {
            frequency: 'daily',
            time: '09:00',
          },
        },
        action_type: 'scrape',
        action_config: {
          scrape: {
            sources: [], // Will be populated with top creators
            limit: 20,
            minQualityScore: 0.7,
          },
        },
        is_active: true,
      },
      {
        name: 'Weekly Content Generation',
        description: 'Generate content ideas weekly for all active clients',
        trigger_type: 'schedule',
        trigger_config: {
          schedule: {
            frequency: 'weekly',
            dayOfWeek: 1, // Monday
            time: '10:00',
          },
        },
        action_type: 'generate',
        action_config: {
          generate: {
            count: 10,
            useTopPerforming: true,
          },
        },
        is_active: true,
      },
      {
        name: 'Low Content Alert',
        description: 'Alert when content queue is running low',
        trigger_type: 'event',
        trigger_config: {
          event: {
            type: 'low_content_queue',
            threshold: 5,
          },
        },
        action_type: 'notify',
        action_config: {
          notify: {
            type: 'in_app',
            message: 'Content queue is running low. Generate more content.',
          },
        },
        is_active: true,
      },
      {
        name: 'Auto-Approve High Quality',
        description: 'Automatically approve content with high quality scores',
        trigger_type: 'event',
        trigger_config: {
          event: {
            type: 'content_approved',
          },
        },
        action_type: 'approve',
        action_config: {
          approve: {
            autoApproveThreshold: 0.85,
            requiresManualReview: false,
          },
        },
        is_active: false, // Disabled by default for safety
      },
    ];

    defaultRules.forEach(rule => {
      const id = crypto.randomUUID();
      this.rules.set(id, {
        ...rule,
        id,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });
  }

  private startAutomationEngine() {
    // Check for scheduled tasks every minute
    setInterval(() => {
      this.checkScheduledTasks();
    }, 60000);

    // Start event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // In production, these would be real event listeners
    // For now, we'll simulate with periodic checks
    
    // Check for low content queue every hour
    setInterval(() => {
      this.checkLowContentQueue();
    }, 3600000);

    // Check for new trending posts every 2 hours
    setInterval(() => {
      this.checkTrendingPosts();
    }, 7200000);
  }

  private async checkScheduledTasks() {
    const now = new Date();
    
    for (const rule of this.rules.values()) {
      if (!rule.is_active || rule.trigger_type !== 'schedule') continue;
      
      if (this.shouldRunScheduledTask(rule, now)) {
        await this.executeRule(rule);
      }
    }
  }

  private shouldRunScheduledTask(rule: AutomationRule, now: Date): boolean {
    if (!rule.trigger_config.schedule) return false;
    
    const schedule = rule.trigger_config.schedule;
    const lastRun = rule.last_run_at;
    
    // Check if enough time has passed since last run
    if (lastRun) {
      const timeSinceLastRun = now.getTime() - lastRun.getTime();
      const minInterval = this.getMinInterval(schedule.frequency);
      
      if (timeSinceLastRun < minInterval) return false;
    }
    
    // Check if it's the right time
    if (schedule.time) {
      const [targetHour, targetMinute] = schedule.time.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Allow 5-minute window
      if (Math.abs(currentHour * 60 + currentMinute - (targetHour * 60 + targetMinute)) > 5) {
        return false;
      }
    }
    
    // Check day constraints
    if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
      if (now.getDay() !== schedule.dayOfWeek) return false;
    }
    
    if (schedule.frequency === 'monthly' && schedule.dayOfMonth !== undefined) {
      if (now.getDate() !== schedule.dayOfMonth) return false;
    }
    
    return true;
  }

  private getMinInterval(frequency: string): number {
    switch (frequency) {
      case 'hourly': return 3600000; // 1 hour
      case 'daily': return 86400000; // 24 hours
      case 'weekly': return 604800000; // 7 days
      case 'monthly': return 2592000000; // 30 days
      default: return 3600000;
    }
  }

  private async checkLowContentQueue() {
    const rules = Array.from(this.rules.values()).filter(
      r => r.is_active && 
      r.trigger_type === 'event' && 
      r.trigger_config.event?.type === 'low_content_queue'
    );
    
    for (const rule of rules) {
      const threshold = rule.trigger_config.event?.threshold || 5;
      
      // Check each client's content queue
      const clients = await clientsService.getAll();
      
      for (const client of clients) {
        const upcomingPosts = await scheduledPostsService.getByClient(client.id);
        const pendingContent = upcomingPosts.filter(p => p.status === 'scheduled');
        
        if (pendingContent.length < threshold) {
          await this.executeRule(rule, { client, queueSize: pendingContent.length });
        }
      }
    }
  }

  private async checkTrendingPosts() {
    const rules = Array.from(this.rules.values()).filter(
      r => r.is_active && 
      r.trigger_type === 'event' && 
      r.trigger_config.event?.type === 'new_trending_post'
    );
    
    for (const rule of rules) {
      // Fetch trending posts
      const trendingPosts = await contentPostsService.getTrending(10);
      
      if (trendingPosts.length > 0) {
        await this.executeRule(rule, { posts: trendingPosts });
      }
    }
  }

  async executeRule(rule: AutomationRule, context?: any): Promise<AutomationLog> {
    const startTime = Date.now();
    const logId = crypto.randomUUID();
    
    // Prevent duplicate execution
    if (this.executionQueue.has(rule.id)) {
      return {
        id: logId,
        rule_id: rule.id,
        status: 'failed',
        error_message: 'Rule already executing',
        created_at: new Date(),
      };
    }
    
    this.executionQueue.add(rule.id);
    
    try {
      let result: any;
      let itemsProcessed = 0;
      
      switch (rule.action_type) {
        case 'scrape':
          result = await this.executeScrapeAction(rule, context);
          itemsProcessed = result.posts?.length || 0;
          break;
          
        case 'generate':
          result = await this.executeGenerateAction(rule, context);
          itemsProcessed = result.generated?.length || 0;
          break;
          
        case 'approve':
          result = await this.executeApproveAction(rule, context);
          itemsProcessed = result.approved?.length || 0;
          break;
          
        case 'publish':
          result = await this.executePublishAction(rule, context);
          itemsProcessed = result.scheduled?.length || 0;
          break;
          
        case 'notify':
          result = await this.executeNotifyAction(rule, context);
          itemsProcessed = 1;
          break;
      }
      
      // Update rule's last run time
      rule.last_run_at = new Date();
      rule.updated_at = new Date();
      
      return {
        id: logId,
        rule_id: rule.id,
        status: 'success',
        details: result,
        items_processed: itemsProcessed,
        execution_time_ms: Date.now() - startTime,
        created_at: new Date(),
      };
    } catch (error) {
      return {
        id: logId,
        rule_id: rule.id,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - startTime,
        created_at: new Date(),
      };
    } finally {
      this.executionQueue.delete(rule.id);
    }
  }

  private async executeScrapeAction(rule: AutomationRule, _context?: any) {
    const config = rule.action_config.scrape;
    if (!config) throw new Error('Invalid scrape configuration');
    
    let sources = config.sources;
    
    // If no sources specified, use top creators
    if (!sources || sources.length === 0) {
      const topCreators = await creatorsService.getTopCreators(10);
      sources = topCreators.map(c => c.linkedin_url);
    }
    
    const allPosts = [];
    
    for (const source of sources) {
      const posts = await apifyService.scrapePosts(source, config.limit || 10);
      
      // Filter by quality score
      const qualityPosts = posts.filter(post => {
        const score = apifyService.calculateQualityScore(post);
        return score >= (config.minQualityScore || 0.7);
      });
      
      allPosts.push(...qualityPosts);
    }
    
    // Save to content lake
    for (const post of allPosts) {
      // Transform and save to database
      // This would integrate with contentPostsService
      console.log(`Scraped: ${post.url}`);
    }
    
    return { posts: allPosts };
  }

  private async executeGenerateAction(rule: AutomationRule, context?: any) {
    const config = rule.action_config.generate;
    if (!config) throw new Error('Invalid generate configuration');
    
    const generated = [];
    const clients = context?.client ? [context.client] : await clientsService.getAll();
    
    for (const client of clients) {
      if (client.status !== 'active') continue;
      
      // Get trending topics
      const trendingPosts = await contentPostsService.getTrending(5);
      
      for (let i = 0; i < config.count; i++) {
        // Select prompt template
        let promptTemplate;
        
        if (config.promptTemplateId) {
          promptTemplate = promptsService.getTemplateById(config.promptTemplateId);
        } else if (config.useTopPerforming) {
          const topTemplates = promptsService.getTopPerformingTemplates(1);
          promptTemplate = topTemplates[0];
        }
        
        // Generate content
        const prompt = this.buildGenerationPrompt(client, trendingPosts[i % trendingPosts.length], promptTemplate);
        
        const result = await generateContent({
          prompt,
          provider: 'openai',
          temperature: 0.7,
        });
        
        if (result.content) {
          // Save generated content
          const savedContent = await generatedContentService.create({
            idea_id: crypto.randomUUID(), // Would link to actual idea
            user_id: client.id, // Using client.id as user_id temporarily
            variant_number: i + 1,
            content_text: result.content,
            hook: result.content.split('\n')[0],
            hashtags: this.extractHashtags(result.content),
            llm_provider: 'openai',
            llm_model: result.model,
            status: 'draft',
          });
          
          generated.push(savedContent);
        }
      }
    }
    
    return { generated };
  }

  private async executeApproveAction(rule: AutomationRule, _context?: any) {
    const config = rule.action_config.approve;
    if (!config) throw new Error('Invalid approve configuration');
    
    const approved = [];
    const clients = await clientsService.getAll();
    
    for (const client of clients) {
      const pendingContent = await generatedContentService.getByClient(client.id, 'draft');
      
      for (const content of pendingContent) {
        // Calculate quality score (would be more sophisticated in production)
        const qualityScore = Math.random(); // Placeholder
        
        if (qualityScore >= (config.autoApproveThreshold || 0.85)) {
          if (!config.requiresManualReview) {
            const success = await generatedContentService.approve(
              content.id,
              'automation',
              'Auto-approved based on quality score'
            );
            
            if (success) {
              approved.push(content);
            }
          }
        }
      }
    }
    
    return { approved };
  }

  private async executePublishAction(rule: AutomationRule, context?: any) {
    const config = rule.action_config.publish;
    if (!config) throw new Error('Invalid publish configuration');
    
    const scheduled = [];
    const approvedContent = context?.content || [];
    
    for (const content of approvedContent) {
      const scheduleTime = new Date();
      scheduleTime.setHours(scheduleTime.getHours() + (config.scheduleAhead || 24));
      
      const scheduledPost = await scheduledPostsService.schedule(
        content.id,
        content.client_id,
        scheduleTime,
        config.platform
      );
      
      if (scheduledPost) {
        scheduled.push(scheduledPost);
      }
    }
    
    return { scheduled };
  }

  private async executeNotifyAction(rule: AutomationRule, context?: any) {
    const config = rule.action_config.notify;
    if (!config) throw new Error('Invalid notify configuration');
    
    // In production, this would send actual notifications
    console.log(`Notification: ${config.message || 'Automation triggered'}`);
    
    return {
      sent: true,
      type: config.type,
      message: config.message,
      context,
    };
  }

  private buildGenerationPrompt(client: Client, trendingPost: any, template?: any): string {
    let prompt = `Generate LinkedIn content for ${client.name} at ${client.company}.\n\n`;
    
    if (client.content_preferences) {
      prompt += `Tone: ${client.content_preferences.tone.join(', ')}\n`;
      prompt += `Topics: ${client.content_preferences.topics.join(', ')}\n`;
      prompt += `Avoid: ${client.content_preferences.avoid.join(', ')}\n\n`;
    }
    
    if (trendingPost) {
      prompt += `Inspired by trending content:\n${trendingPost.content_text.substring(0, 200)}...\n\n`;
    }
    
    if (template) {
      prompt += `Use this structure:\n${template.template_text}\n\n`;
    }
    
    prompt += 'Create engaging, valuable content that drives meaningful engagement.';
    
    return prompt;
  }

  private extractHashtags(text: string): string[] {
    const regex = /#\w+/g;
    const matches = text.match(regex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  // Public API
  getAllRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  getRuleById(id: string): AutomationRule | null {
    return this.rules.get(id) || null;
  }

  createRule(rule: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>): AutomationRule {
    const id = crypto.randomUUID();
    const newRule: AutomationRule = {
      ...rule,
      id,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    this.rules.set(id, newRule);
    return newRule;
  }

  updateRule(id: string, updates: Partial<AutomationRule>): AutomationRule | null {
    const rule = this.rules.get(id);
    if (!rule) return null;
    
    const updatedRule = {
      ...rule,
      ...updates,
      id: rule.id,
      updated_at: new Date(),
    };
    
    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  deleteRule(id: string): boolean {
    // Stop any active timers
    const timer = this.activeTimers.get(id);
    if (timer) {
      clearInterval(timer as any);
      this.activeTimers.delete(id);
    }
    
    return this.rules.delete(id);
  }

  toggleRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    
    rule.is_active = !rule.is_active;
    rule.updated_at = new Date();
    
    return true;
  }

  // Manual trigger
  async triggerRule(id: string): Promise<AutomationLog> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error('Rule not found');
    }
    
    return this.executeRule(rule);
  }
}

// Export singleton instance
export const automationService = new AutomationService();