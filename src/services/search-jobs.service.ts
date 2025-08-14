// Service for managing background search jobs
import { supabase } from '../lib/supabase';

export interface SearchJob {
  id: string;
  search_query: string;
  search_params: {
    topics?: string[];
    industry?: string;
    targetAudience?: string;
    count?: number;
    mode?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_summary?: string;
  result_count: number;
  ideas_generated?: string[];
  started_at?: Date;
  completed_at?: Date;
  processing_time_seconds?: number;
  error_message?: string;
  notification_sent: boolean;
  created_at: Date;
  updated_at: Date;
}

export const searchJobsService = {
  async create(searchQuery: string, params: any = {}): Promise<SearchJob | null> {
    console.log('📝 Creating search job:', { searchQuery, params });
    
    const { data, error } = await supabase
      .from('search_jobs')
      .insert([{
        search_query: searchQuery,
        search_params: params,
        status: 'pending'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating search job:', error);
      return null;
    }
    
    console.log('✅ Search job created:', data.id);
    return data;
  },

  async getById(id: string): Promise<SearchJob | null> {
    const { data, error } = await supabase
      .from('search_jobs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching search job:', error);
      return null;
    }
    
    return data;
  },

  async getAll(filters?: { status?: string }): Promise<SearchJob[]> {
    let query = supabase
      .from('search_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching search jobs:', error);
      return [];
    }
    
    return data || [];
  },

  async getRecentJobs(limit: number = 5): Promise<SearchJob[]> {
    const { data, error } = await supabase
      .from('search_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent jobs:', error);
      return [];
    }
    
    return data || [];
  },

  async getPendingJobs(): Promise<SearchJob[]> {
    const { data, error } = await supabase
      .from('search_jobs')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching pending jobs:', error);
      return [];
    }
    
    return data || [];
  },

  async updateStatus(
    id: string, 
    status: SearchJob['status'], 
    updates: Partial<SearchJob> = {}
  ): Promise<boolean> {
    const updateData: any = { status, ...updates };
    
    if (status === 'processing') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
      
      // Calculate processing time if started_at exists
      if (updates.started_at) {
        const startTime = new Date(updates.started_at as any).getTime();
        const endTime = new Date().getTime();
        updateData.processing_time_seconds = Math.floor((endTime - startTime) / 1000);
      }
    }
    
    const { error } = await supabase
      .from('search_jobs')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating search job:', error);
      return false;
    }
    
    return true;
  },

  async markNotificationSent(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('search_jobs')
      .update({ notification_sent: true })
      .eq('id', id);
    
    if (error) {
      console.error('Error marking notification sent:', error);
      return false;
    }
    
    return true;
  },

  // Get count of active (pending/processing) jobs
  async getActiveJobCount(): Promise<number> {
    const { count, error } = await supabase
      .from('search_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'processing']);
    
    if (error) {
      console.error('Error counting active jobs:', error);
      return 0;
    }
    
    return count || 0;
  }
};

export default searchJobsService;