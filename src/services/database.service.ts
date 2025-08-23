import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { 
  Creator, 
  ContentPost, 
  ContentIdea, 
  GeneratedContent 
} from '../lib/supabase';

// Re-export types
export type { GeneratedContent, ContentIdea };

// =====================================================
// CLIENTS SERVICE
// =====================================================

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  linkedin_url?: string;
  website?: string;
  industry?: string;
  status: 'active' | 'paused' | 'onboarding' | 'churned';
  posting_frequency?: string;
  content_preferences?: {
    tone: string[];
    topics: string[];
    formats: string[];
    avoid: string[];
  };
  brand_guidelines?: string;
  notes?: string;
  assigned_ghostwriter?: string;
  created_at: Date;
  updated_at: Date;
}

export const clientsService = {
  async getAll(): Promise<Client[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - returning empty array');
      return [];
    }
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
    
    return data || [];
  },

  async getById(id: string): Promise<Client | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - returning null');
      return null;
    }
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching client:', error);
      return null;
    }
    
    return data;
  },

  async create(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client | null> {
    if (!isSupabaseConfigured()) {
      const newClient = {
        ...client,
        id: crypto.randomUUID(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      return newClient;
    }
    
    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating client:', error);
      return null;
    }
    
    return data;
  },

  async update(id: string, updates: Partial<Client>): Promise<Client | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot update');
      return null;
    }
    
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating client:', error);
      return null;
    }
    
    return data;
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting client:', error);
      return false;
    }
    
    return true;
  },
};

// =====================================================
// CREATORS SERVICE (Content Lake)
// =====================================================

export const creatorsService = {
  async getAll(): Promise<Creator[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('is_active', true)
      .order('average_reactions', { ascending: false });
    
    if (error) {
      console.error('Error fetching creators:', error);
      return [];
    }
    
    return data || [];
  },

  async getTopCreators(limit = 10): Promise<Creator[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('is_active', true)
      .order('average_reactions', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching top creators:', error);
      return [];
    }
    
    return data || [];
  },

  async searchByThemes(themes: string[]): Promise<Creator[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .contains('content_themes', themes)
      .order('average_reactions', { ascending: false });
    
    if (error) {
      console.error('Error searching creators:', error);
      return [];
    }
    
    return data || [];
  },
};

// =====================================================
// CONTENT POSTS SERVICE
// =====================================================

export const contentPostsService = {
  async getAll(filters?: {
    creator_id?: string;
    min_quality_score?: number;
    themes?: string[];
  }): Promise<ContentPost[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    let query = supabase
      .from('content_posts')
      .select('*')
      .order('posted_at', { ascending: false });
    
    if (filters?.creator_id) {
      query = query.eq('creator_id', filters.creator_id);
    }
    
    if (filters?.min_quality_score) {
      query = query.gte('quality_score', filters.min_quality_score);
    }
    
    if (filters?.themes && filters.themes.length > 0) {
      query = query.contains('content_themes', filters.themes);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching content posts:', error);
      return [];
    }
    
    return data || [];
  },

  async getTrending(limit = 20): Promise<ContentPost[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .gte('quality_score', 0.7)
      .order('reactions_count', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching trending posts:', error);
      return [];
    }
    
    return data || [];
  },

  async searchContent(searchTerm: string): Promise<ContentPost[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .textSearch('content_text', searchTerm)
      .order('quality_score', { ascending: false });
    
    if (error) {
      console.error('Error searching posts:', error);
      return [];
    }
    
    return data || [];
  },
};

// =====================================================
// CONTENT IDEAS SERVICE
// =====================================================

// Old contentIdeasService removed - using new one below

// =====================================================
// GENERATED CONTENT SERVICE
// =====================================================

export const generatedContentService = {
  async getAll(): Promise<GeneratedContent[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('generated_content')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all generated content:', error);
      
      // Check if it's a missing table error
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        console.error('❌ CRITICAL: The generated_content table does not exist in Supabase!');
        console.error('Please run the SQL migration script in supabase_migration.sql');
      }
      
      return [];
    }
    
    return data || [];
  },

  async getByIdea(ideaId: string): Promise<GeneratedContent[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('generated_content')
      .select('*')
      .eq('idea_id', ideaId)
      .order('variant_number', { ascending: true });
    
    if (error) {
      console.error('Error fetching generated content:', error);
      return [];
    }
    
    return data || [];
  },

  async getByClient(clientId: string, status?: GeneratedContent['status']): Promise<GeneratedContent[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    let query = supabase
      .from('generated_content')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching generated content:', error);
      return [];
    }
    
    return data || [];
  },

  async create(content: Omit<GeneratedContent, 'id' | 'created_at' | 'updated_at'>): Promise<GeneratedContent | null> {
    if (!isSupabaseConfigured()) {
      return {
        ...content,
        id: crypto.randomUUID(),
        created_at: new Date(),
        updated_at: new Date(),
      } as GeneratedContent;
    }
    
    const { data, error } = await supabase
      .from('generated_content')
      .insert([content])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating generated content:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      
      // Check if it's a missing table error
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        console.error('❌ CRITICAL: The generated_content table does not exist in Supabase!');
        console.error('Please run the SQL migration script in supabase_migration.sql');
        alert('Database Error: The generated_content table is missing. Please contact your administrator to run the database migration.');
      }
      
      return null;
    }
    
    return data;
  },

  async approve(id: string, approvedBy: string, notes?: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }
    
    const { error } = await supabase
      .from('generated_content')
      .update({
        status: 'admin_approved',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
        revision_notes: notes,
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error approving content:', error);
      return false;
    }
    
    return true;
  },

  async reject(id: string, notes: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }
    
    const { error } = await supabase
      .from('generated_content')
      .update({
        status: 'admin_rejected',
        revision_notes: notes,
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error rejecting content:', error);
      return false;
    }
    
    return true;
  },

  async requestRevision(id: string, notes: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }
    
    const { error } = await supabase
      .from('generated_content')
      .update({
        status: 'revision_requested',
        revision_notes: notes,
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error requesting revision:', error);
      return false;
    }
    
    return true;
  },

  async update(id: string, updates: Partial<GeneratedContent>): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, skipping update');
      return true;
    }
    
    console.log('Updating content:', id, 'with:', updates);
    
    const { data, error } = await supabase
      .from('generated_content')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error updating content:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      return false;
    }
    
    console.log('Update successful:', data);
    return true;
  },
};

// =====================================================
// SCHEDULED POSTS SERVICE
// =====================================================

export interface ScheduledPost {
  id: string;
  content_id: string;
  client_id: string;
  scheduled_for: Date;
  platform: 'linkedin' | 'twitter' | 'both';
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  published_at?: Date;
  published_url?: string;
  publish_error?: string;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

export const scheduledPostsService = {
  async getAll(): Promise<ScheduledPost[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .order('scheduled_for', { ascending: true });
    
    if (error) {
      console.error('Error fetching all scheduled posts:', error);
      return [];
    }
    
    return data || [];
  },

  async getByClient(clientId: string): Promise<ScheduledPost[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('client_id', clientId)
      .order('scheduled_for', { ascending: true });
    
    if (error) {
      console.error('Error fetching scheduled posts:', error);
      return [];
    }
    
    return data || [];
  },

  async getUpcoming(limit = 10): Promise<ScheduledPost[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'scheduled')
      .gte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching upcoming posts:', error);
      return [];
    }
    
    return data || [];
  },

  async schedule(contentId: string, clientId: string, scheduledFor: Date, platform: ScheduledPost['platform'] = 'linkedin'): Promise<ScheduledPost | null> {
    if (!isSupabaseConfigured()) {
      return {
        id: crypto.randomUUID(),
        content_id: contentId,
        client_id: clientId,
        scheduled_for: scheduledFor,
        platform,
        status: 'scheduled',
        retry_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
    
    const { data, error } = await supabase
      .from('scheduled_posts')
      .insert([{
        content_id: contentId,
        client_id: clientId,
        scheduled_for: scheduledFor.toISOString(),
        platform,
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error scheduling post:', error);
      return null;
    }
    
    return data;
  },

  async cancel(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }
    
    const { error } = await supabase
      .from('scheduled_posts')
      .update({ status: 'cancelled' })
      .eq('id', id);
    
    if (error) {
      console.error('Error cancelling post:', error);
      return false;
    }
    
    return true;
  },
};

// =====================================================
// ANALYTICS SERVICE
// =====================================================

export interface ContentAnalytics {
  id: string;
  scheduled_post_id: string;
  client_id: string;
  impressions: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate?: number;
  reach: number;
  follower_change: number;
  recorded_at: Date;
  data_source: 'linkedin_api' | 'manual' | 'estimated';
  created_at: Date;
}

export const analyticsService = {
  async getByClient(clientId: string, dateRange?: { start: Date; end: Date }): Promise<ContentAnalytics[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    let query = supabase
      .from('content_analytics')
      .select('*')
      .eq('client_id', clientId)
      .order('recorded_at', { ascending: false });
    
    if (dateRange) {
      query = query
        .gte('recorded_at', dateRange.start.toISOString())
        .lte('recorded_at', dateRange.end.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching analytics:', error);
      return [];
    }
    
    return data || [];
  },

  async record(analytics: Omit<ContentAnalytics, 'id' | 'created_at'>): Promise<ContentAnalytics | null> {
    if (!isSupabaseConfigured()) {
      return {
        ...analytics,
        id: crypto.randomUUID(),
        created_at: new Date(),
      };
    }
    
    const { data, error } = await supabase
      .from('content_analytics')
      .insert([analytics])
      .select()
      .single();
    
    if (error) {
      console.error('Error recording analytics:', error);
      return null;
    }
    
    return data;
  },
};

// =====================================================
// CONTENT IDEAS SERVICE
// =====================================================

export interface ContentIdeaDB {
  id: string;
  client_id?: string;
  ghostwriter_id?: string;
  user_id?: string;
  source_post_id?: string;
  source: 'trending' | 'ai' | 'manual' | 'content-lake' | 'client-request' | 'competitor' | 'slack';
  title: string;
  description?: string;
  hook?: string;
  key_points?: string[];
  target_audience?: string;
  content_format?: string;
  category?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'ready' | 'in-progress' | 'used' | 'archived' | 'rejected';
  score?: number;
  predicted_engagement?: number;
  actual_engagement?: number;
  ai_model?: string;
  ai_reasoning_effort?: string;
  ai_generation_params?: any;
  linkedin_style?: string;
  hashtags?: string[];
  optimal_posting_time?: Date;
  competitor_reference?: string;
  trend_reference?: string;
  trend_growth_rate?: string;
  expanded_content?: any;
  content_variations?: any;
  notes?: string;
  feedback?: string;
  rejection_reason?: string;
  used_in_content_id?: string;
  slack_message_id?: string;
  slack_channel_id?: string;
  slack_user_name?: string;
  original_message_url?: string;
  used_count: number;
  created_at: Date;
  updated_at: Date;
  scheduled_for?: Date;
  archived_at?: Date;
}

export const contentIdeasService = {
  async getAll(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    client_id?: string;
    source?: string;
  }): Promise<ContentIdeaDB[]> {
    console.log('🔍 ContentIdeasService.getAll called with filters:', filters);
    
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured, returning empty array');
      return [];
    }
    
    console.log('📡 Fetching from Supabase content_ideas table...');
    let query = supabase
      .from('content_ideas')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.priority) query = query.eq('priority', filters.priority);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.client_id) query = query.eq('client_id', filters.client_id);
    if (filters?.source) query = query.eq('source', filters.source);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching content ideas from Supabase:', error);
      console.error('Error details:', { code: error.code, message: error.message, details: error.details });
      console.error('⚠️ Database error - returning empty array');
      return [];
    }
    
    console.log('✅ Successfully fetched ideas from database:', data?.length || 0, 'ideas');
    return data || [];
  },

  async getById(id: string): Promise<ContentIdeaDB | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('content_ideas')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching content idea:', error);
      return null;
    }
    
    return data;
  },

  async create(idea: Omit<ContentIdeaDB, 'id' | 'created_at' | 'updated_at' | 'used_count'>): Promise<ContentIdeaDB | null> {
    console.log('📝 Creating content idea:', idea);
    
    if (!isSupabaseConfigured()) {
      const newIdea: ContentIdeaDB = {
        ...idea,
        id: crypto.randomUUID(),
        used_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      console.warn('Cannot create idea - Supabase not configured');
      return null;
    }
    
    console.log('💾 Inserting into Supabase content_ideas table...');
    const { data, error } = await supabase
      .from('content_ideas')
      .insert([{
        ...idea,
        used_count: 0
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating content idea:', error);
      console.error('Error details:', { 
        code: error.code, 
        message: error.message, 
        details: error.details,
        hint: error.hint
      });
      console.error('Failed idea data:', idea);
      return null;
    }
    
    console.log('✅ Successfully created content idea:', data?.id);
    return data;
  },

  async createBulk(ideas: Omit<ContentIdeaDB, 'id' | 'created_at' | 'updated_at' | 'used_count'>[]): Promise<ContentIdeaDB[]> {
    if (!isSupabaseConfigured()) {
      return ideas.map(idea => ({
        ...idea,
        id: crypto.randomUUID(),
        used_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }));
    }
    
    const { data, error } = await supabase
      .from('content_ideas')
      .insert(ideas.map(idea => ({
        ...idea,
        used_count: 0
      })))
      .select();
    
    if (error) {
      console.error('Error creating content ideas:', error);
      return [];
    }
    
    return data || [];
  },

  async update(id: string, updates: Partial<ContentIdeaDB>): Promise<ContentIdeaDB | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Cannot update idea - Supabase not configured');
      return null;
    }
    
    const { data, error } = await supabase
      .from('content_ideas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating content idea:', error);
      return null;
    }
    
    return data;
  },

  async updateStatus(id: string, status: ContentIdeaDB['status'], notes?: string): Promise<boolean> {
    const updates: Partial<ContentIdeaDB> = { status };
    if (notes) updates.notes = notes;
    
    const result = await this.update(id, updates);
    return !!result;
  },

  async archive(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Cannot archive idea - Supabase not configured');
      return false;
    }
    
    const { error } = await supabase
      .from('content_ideas')
      .update({ archived_at: new Date() })
      .eq('id', id);
    
    if (error) {
      console.error('Error archiving content idea:', error);
      return false;
    }
    
    return true;
  },

  async search(query: string): Promise<ContentIdeaDB[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Cannot search ideas - Supabase not configured');
      return [];
    }
    
    const { data, error } = await supabase
      .from('content_ideas')
      .select('*')
      .is('archived_at', null)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('score', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error searching content ideas:', error);
      return [];
    }
    
    return data || [];
  },

  async getTopIdeas(limit: number = 10): Promise<ContentIdeaDB[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('content_ideas')
      .select('*')
      .eq('status', 'ready')
      .is('archived_at', null)
      .order('score', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching top ideas:', error);
      return [];
    }
    
    return data || [];
  },

  async markAsUsed(id: string, contentId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Cannot mark idea as used - Supabase not configured');
      return false;
    }
    
    const { error } = await supabase
      .from('content_ideas')
      .update({
        status: 'used',
        used_in_content_id: contentId,
        used_count: supabase.raw('used_count + 1')
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error marking idea as used:', error);
      return false;
    }
    
    return true;
  },
};

// =====================================================
// All mock data has been removed - Using real database only
// =====================================================

// =====================================================
// PROMPT TEMPLATES SERVICE
// =====================================================

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  system_message: string;
  examples?: any;
  variables?: any;
  settings?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  provider: string;
  model?: string;
  tags?: string[];
  is_active: boolean;
  is_default?: boolean;
  version?: number;
  parent_id?: string;
  usage_count?: number;
  success_rate?: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export const promptTemplatesService = {
  async getAll(): Promise<PromptTemplate[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    // Add cache-busting timestamp to ensure fresh data
    const timestamp = Date.now();
    console.log(`Fetching all prompt templates at ${timestamp}`);
    
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching prompt templates:', error);
      return [];
    }
    
    console.log(`Retrieved ${data?.length || 0} active prompts`);
    return data || [];
  },

  async getByCategory(category: string): Promise<PromptTemplate[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching prompts by category:', error);
      return [];
    }
    
    return data || [];
  },

  async getById(id: string): Promise<PromptTemplate | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching prompt:', error);
      return null;
    }
    
    return data;
  },

  async create(prompt: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<PromptTemplate | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('prompt_templates')
      .insert([prompt])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating prompt:', error);
      return null;
    }
    
    return data;
  },

  async update(id: string, updates: Partial<PromptTemplate>): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase not configured!');
      alert('Database connection error: Supabase not configured');
      return false;
    }
    
    // Create a clean update object with only the fields we want to update
    const cleanUpdate: any = {
      name: updates.name,
      category: updates.category,
      description: updates.description,
      system_message: updates.system_message,
      provider: updates.provider,
      model: updates.model,
      tags: updates.tags,
      settings: updates.settings,
      is_active: updates.is_active !== undefined ? updates.is_active : true,
      updated_at: new Date().toISOString()
    };
    
    // Remove undefined values
    Object.keys(cleanUpdate).forEach(key => {
      if (cleanUpdate[key] === undefined) {
        delete cleanUpdate[key];
      }
    });
    
    console.log('🔄 Updating prompt template:', id);
    console.log('📝 Clean update data:', JSON.stringify(cleanUpdate, null, 2));
    
    const { data, error } = await supabase
      .from('prompt_templates')
      .update(cleanUpdate)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('❌ Supabase error updating prompt:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      
      // If it's a schema cache error, provide specific instructions
      if (error.message?.includes('schema cache') || error.message?.includes('_jsonschema')) {
        alert('Database schema error detected!\n\nPlease run the fix_prompt_templates_schema.sql script in Supabase SQL Editor to fix this issue.\n\nThis will recreate the prompt_templates table with the correct structure.');
      } else {
        alert(`Database error: ${error.message || 'Unknown error'}\n\nDetails: ${error.details || 'No details'}\n\nHint: ${error.hint || 'No hint'}`);
      }
      return false;
    }
    
    console.log('✅ Prompt updated successfully:', data);
    return true;
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('prompt_templates')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting prompt:', error);
      return false;
    }
    
    return true;
  },

  async incrementUsage(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    const { data: current, error: fetchError } = await supabase
      .from('prompt_templates')
      .select('usage_count')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching prompt for usage update:', fetchError);
      return false;
    }
    
    const { error } = await supabase
      .from('prompt_templates')
      .update({ usage_count: (current?.usage_count || 0) + 1 })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating usage count:', error);
      return false;
    }
    
    return true;
  },

  async logUsage(promptId: string, input: any, output: any, rating?: number): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    const { error } = await supabase
      .from('prompt_usage_history')
      .insert([{
        prompt_template_id: promptId,
        input_data: input,
        output_data: output,
        rating: rating
      }]);
    
    if (error) {
      console.error('Error logging prompt usage:', error);
      return false;
    }
    
    // Also increment the usage counter
    await this.incrementUsage(promptId);
    
    return true;
  }
};