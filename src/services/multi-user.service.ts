// =====================================================
// MULTI-USER SERVICE
// Service for managing user switching, prompt personalization, and multi-tenant features
// =====================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  UserPromptOverride,
  AdminSession,
  EnhancedClient,
  EnhancedGeneratedContent,
  ClientPromptOverview,
  PersonalizedPromptResult,
  ClientPromptsResponse,
  GenerationRequest,
  GenerationResponse,
  ClientAnalytics
} from '../types/multi-user.types';

// =====================================================
// ENHANCED CLIENTS SERVICE
// =====================================================

export const enhancedClientsService = {
  async getAll(): Promise<EnhancedClient[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        users!clients_user_id_fkey (
          full_name,
          email,
          role
        )
      `)
      .eq('portal_access', true)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching enhanced clients:', error);
      return [];
    }
    
    return data || [];
  },

  async getById(id: string): Promise<EnhancedClient | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        users!clients_user_id_fkey (
          full_name,
          email,
          role
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching enhanced client:', error);
      return null;
    }
    
    return data;
  },

  async getByUserId(userId: string): Promise<EnhancedClient | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .eq('portal_access', true)
      .single();
    
    if (error) {
      console.error('Error fetching client by user ID:', error);
      return null;
    }
    
    return data;
  },

  async updatePortalAccess(clientId: string, hasAccess: boolean): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    const { error } = await supabase
      .from('clients')
      .update({ portal_access: hasAccess })
      .eq('id', clientId);
    
    if (error) {
      console.error('Error updating portal access:', error);
      return false;
    }
    
    return true;
  }
};

// =====================================================
// ADMIN SESSION MANAGEMENT
// =====================================================

export const adminSessionService = {
  async getCurrentSession(adminUserId: string): Promise<AdminSession | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('admin_sessions')
      .select(`
        *,
        clients!admin_sessions_active_client_id_fkey (
          id,
          name,
          company,
          email
        )
      `)
      .eq('admin_user_id', adminUserId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching admin session:', error);
      return null;
    }
    
    return data;
  },

  async switchToClient(adminUserId: string, clientId: string): Promise<AdminSession | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const sessionData = {
      admin_user_id: adminUserId,
      active_client_id: clientId,
      switched_at: new Date().toISOString(),
      session_data: {
        last_switch: new Date().toISOString(),
        switch_count: 1
      }
    };
    
    const { data, error } = await supabase
      .from('admin_sessions')
      .upsert(sessionData, { 
        onConflict: 'admin_user_id' 
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error switching to client:', error);
      return null;
    }
    
    // Store in localStorage for persistence
    localStorage.setItem('active_client_id', clientId);
    localStorage.setItem('admin_session', JSON.stringify(data));
    
    return data;
  },

  async clearActiveClient(adminUserId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    const { error } = await supabase
      .from('admin_sessions')
      .update({ 
        active_client_id: null,
        switched_at: new Date().toISOString()
      })
      .eq('admin_user_id', adminUserId);
    
    if (error) {
      console.error('Error clearing active client:', error);
      return false;
    }
    
    // Clear localStorage
    localStorage.removeItem('active_client_id');
    localStorage.removeItem('admin_session');
    
    return true;
  }
};

// =====================================================
// PROMPT PERSONALIZATION SERVICE
// =====================================================

export const promptPersonalizationService = {
  async getClientPrompts(clientId: string): Promise<ClientPromptsResponse> {
    if (!isSupabaseConfigured()) {
      return {
        client: {} as EnhancedClient,
        prompts: [],
        total_prompts: 0,
        customized_count: 0
      };
    }
    
    // Get client info
    const client = await enhancedClientsService.getById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }
    
    // Get prompt overview
    const { data, error } = await supabase
      .from('client_prompt_overview')
      .select('*')
      .eq('client_id', clientId);
    
    if (error) {
      console.error('Error fetching client prompts:', error);
      throw error;
    }
    
    const prompts = data || [];
    const customizedCount = prompts.filter((p: ClientPromptOverview) => p.prompt_status === 'customized').length;
    
    return {
      client,
      prompts,
      total_prompts: prompts.length,
      customized_count: customizedCount
    };
  },

  async getPersonalizedPrompt(clientId: string, promptId: string): Promise<PersonalizedPromptResult | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const { data, error } = await supabase
      .rpc('get_client_prompt', {
        p_client_id: clientId,
        p_prompt_id: promptId
      });
    
    if (error) {
      console.error('Error getting personalized prompt:', error);
      return null;
    }
    
    return data?.[0] || null;
  },

  async createOverride(override: Omit<UserPromptOverride, 'id' | 'created_at' | 'updated_at'>): Promise<UserPromptOverride | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_prompt_overrides')
      .insert([override])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating prompt override:', error);
      return null;
    }
    
    return data;
  },

  async updateOverride(overrideId: string, updates: Partial<UserPromptOverride>): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    const { error } = await supabase
      .from('user_prompt_overrides')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', overrideId);
    
    if (error) {
      console.error('Error updating prompt override:', error);
      return false;
    }
    
    return true;
  },

  async deleteOverride(overrideId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    const { error } = await supabase
      .from('user_prompt_overrides')
      .delete()
      .eq('id', overrideId);
    
    if (error) {
      console.error('Error deleting prompt override:', error);
      return false;
    }
    
    return true;
  },

  async bulkCreateOverrides(clientId: string, sourceClientId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    // Get all overrides from source client
    const { data: sourceOverrides, error: fetchError } = await supabase
      .from('user_prompt_overrides')
      .select('*')
      .eq('client_id', sourceClientId)
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('Error fetching source overrides:', fetchError);
      return false;
    }
    
    if (!sourceOverrides || sourceOverrides.length === 0) {
      return true; // No overrides to copy
    }
    
    // Create new overrides for target client
    const newOverrides = sourceOverrides.map((override: UserPromptOverride) => ({
      client_id: clientId,
      base_prompt_id: override.base_prompt_id,
      customized_system_message: override.customized_system_message,
      customized_settings: override.customized_settings,
      is_active: true
    }));
    
    const { error: insertError } = await supabase
      .from('user_prompt_overrides')
      .insert(newOverrides);
    
    if (insertError) {
      console.error('Error bulk creating overrides:', insertError);
      return false;
    }
    
    return true;
  }
};

// =====================================================
// ENHANCED CONTENT GENERATION
// =====================================================

export const enhancedContentService = {
  async generateForClient(request: GenerationRequest): Promise<GenerationResponse> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured');
    }
    
    const startTime = Date.now();
    
    try {
      // Get personalized prompts for the client
      let promptsToUse: PersonalizedPromptResult[] = [];
      
      if (request.specific_prompt_ids && request.specific_prompt_ids.length > 0) {
        // Use specific prompts requested
        for (const promptId of request.specific_prompt_ids) {
          const prompt = await promptPersonalizationService.getPersonalizedPrompt(
            request.client_id, 
            promptId
          );
          if (prompt) {
            promptsToUse.push(prompt);
          }
        }
      } else {
        // Get all active Content Generation prompts for the client
        const { prompts } = await promptPersonalizationService.getClientPrompts(request.client_id);
        const contentGenPrompts = prompts.filter(p => p.category === 'Content Generation');
        
        for (const promptOverview of contentGenPrompts.slice(0, request.number_of_variations || 4)) {
          const prompt = await promptPersonalizationService.getPersonalizedPrompt(
            request.client_id, 
            promptOverview.prompt_id
          );
          if (prompt) {
            promptsToUse.push(prompt);
          }
        }
      }
      
      if (promptsToUse.length === 0) {
        throw new Error('No prompts available for this client');
      }
      
      // TODO: Integrate with actual LLM service to generate content
      // For now, return mock data structure
      const mockContent: EnhancedGeneratedContent[] = promptsToUse.map((prompt, index) => ({
        id: `mock-${Date.now()}-${index}`,
        client_id: request.client_id,
        variant_number: index + 1,
        content_text: `Mock content generated using ${prompt.is_customized ? 'personalized' : 'default'} prompt: ${request.content_idea}`,
        hook: `Mock hook for ${request.content_idea}`,
        hashtags: ['#MockContent', '#AI', '#LinkedIn'],
        llm_provider: 'google' as const,
        llm_model: 'gemini-2.5-pro',
        generation_prompt: prompt.system_message,
        status: 'draft' as const,
        base_prompt_id: prompt.prompt_id,
        prompt_override_id: prompt.is_customized ? `override-${prompt.prompt_id}` : undefined,
        created_at: new Date(),
        updated_at: new Date()
      }));
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        content: mockContent,
        prompts_used: promptsToUse.map(prompt => ({
          prompt_id: prompt.prompt_id,
          prompt_name: 'Prompt Name', // TODO: Get actual prompt name
          was_customized: prompt.is_customized,
          override_id: prompt.is_customized ? `override-${prompt.prompt_id}` : undefined
        })),
        total_tokens: 1000, // Mock value
        total_cost: 0.05, // Mock value
        processing_time_ms: processingTime
      };
      
    } catch (error) {
      console.error('Error generating content for client:', error);
      throw error;
    }
  },

  async getContentForApproval(clientId: string): Promise<EnhancedGeneratedContent[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('generated_content')
      .select(`
        *,
        clients!generated_content_client_id_fkey (
          name,
          company
        ),
        user_prompt_overrides!generated_content_prompt_override_id_fkey (
          customized_system_message
        )
      `)
      .eq('client_id', clientId)
      .eq('status', 'admin_approved')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching content for approval:', error);
      return [];
    }
    
    return data || [];
  }
};

// =====================================================
// CLIENT ANALYTICS SERVICE
// =====================================================

export const clientAnalyticsService = {
  async getClientAnalytics(clientId: string): Promise<ClientAnalytics | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    try {
      // Get basic client info
      const client = await enhancedClientsService.getById(clientId);
      if (!client) {
        return null;
      }
      
      // Get content generation stats
      const { data: contentStats, error: contentError } = await supabase
        .from('generated_content')
        .select('status, created_at, approved_at')
        .eq('client_id', clientId);
      
      if (contentError) {
        console.error('Error fetching content stats:', contentError);
        return null;
      }
      
      // Get prompt customization stats
      const { data: promptStats, error: promptError } = await supabase
        .from('client_prompt_overview')
        .select('prompt_status')
        .eq('client_id', clientId);
      
      if (promptError) {
        console.error('Error fetching prompt stats:', promptError);
        return null;
      }
      
      // Calculate analytics
      const totalContent = contentStats?.length || 0;
      const approvedContent = contentStats?.filter((c: any) => c.status === 'client_approved').length || 0;
      const approvalRate = totalContent > 0 ? (approvedContent / totalContent) * 100 : 0;
      
      // Calculate average approval time
      const approvalTimes = contentStats
        ?.filter((c: any) => c.approved_at)
        .map((c: any) => {
          const created = new Date(c.created_at);
          const approved = new Date(c.approved_at!);
          return (approved.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
        }) || [];
      
      const avgApprovalTime = approvalTimes.length > 0 
        ? approvalTimes.reduce((a: number, b: number) => a + b, 0) / approvalTimes.length
        : 0;
      
      // Calculate prompt customization stats
      const totalPrompts = promptStats?.length || 0;
      const customizedPrompts = promptStats?.filter((p: ClientPromptOverview) => p.prompt_status === 'customized').length || 0;
      const customizationRate = totalPrompts > 0 ? (customizedPrompts / totalPrompts) * 100 : 0;
      
      return {
        client_id: clientId,
        client_name: client.name,
        content_generated: totalContent,
        approval_rate: approvalRate,
        average_approval_time_hours: avgApprovalTime,
        top_performing_prompts: [], // TODO: Implement when we have engagement data
        prompt_customization_stats: {
          total_prompts: totalPrompts,
          customized_prompts: customizedPrompts,
          customization_rate: customizationRate
        },
        mobile_usage: {
          total_approvals: approvedContent,
          mobile_approvals: 0, // TODO: Track mobile vs desktop approvals
          mobile_usage_rate: 0
        }
      };
      
    } catch (error) {
      console.error('Error calculating client analytics:', error);
      return null;
    }
  }
};

// =====================================================
// MOBILE SERVICE
// =====================================================

export const mobileService = {
  async authenticateWithPin(email: string, pin: string): Promise<{ success: boolean; client?: EnhancedClient; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database not configured' };
    }
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .eq('mobile_pin', pin)
      .eq('portal_access', true)
      .single();
    
    if (error || !data) {
      return { success: false, error: 'Invalid email or PIN' };
    }
    
    return { success: true, client: data };
  },

  async getPendingApprovals(clientId: string): Promise<EnhancedGeneratedContent[]> {
    return enhancedContentService.getContentForApproval(clientId);
  }
};

// Services are already exported inline above