import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client only if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

if (!isSupabaseConfigured()) {
  console.warn('⚠️ Supabase not configured. Using mock data. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
}

// Database types
export interface Creator {
  id: string;
  name: string;
  linkedin_url: string;
  profile_image?: string;
  follower_count?: number;
  bio?: string;
  average_reactions?: number;
  content_themes?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ContentPost {
  id: string;
  creator_id: string;
  original_url: string;
  content_text: string;
  post_type: 'text' | 'image' | 'video' | 'carousel' | 'document';
  reactions_count: number;
  comments_count: number;
  shares_count: number;
  media_urls?: string[];
  hashtags?: string[];
  mentions?: string[];
  posted_at: Date;
  scraped_at: Date;
  quality_score?: number;
  is_promotional: boolean;
  content_themes?: string[];
}

export interface ContentIdea {
  id: string;
  client_id?: string;
  ghostwriter_id?: string;
  user_id?: string;
  source_post_id?: string;
  source?: 'trending' | 'ai' | 'manual' | 'content-lake' | 'client-request';
  title: string;
  description?: string;
  hook?: string;
  key_points?: string[];
  target_audience?: string;
  content_format?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'draft' | 'ready' | 'in-progress' | 'used' | 'archived';
  score?: number;
  created_at: Date;
  updated_at: Date;
}

export interface GeneratedContent {
  id: string;
  idea_id?: string;
  client_id?: string;
  ghostwriter_id?: string;
  user_id?: string;
  variant_number: number;
  content_text: string;
  hook: string;
  hashtags?: string[];
  estimated_read_time?: number;
  llm_provider: 'google' | 'anthropic' | 'openai';
  llm_model?: string;
  generation_prompt?: string;
  status: 'draft' | 'admin_approved' | 'admin_rejected' | 'client_approved' | 'client_rejected' | 'client_edited' | 'scheduled' | 'published';
  revision_notes?: string;
  approved_at?: Date;
  approved_by?: string;
  created_at: Date;
  updated_at: Date;
  // New archive and scheduling fields
  archived?: boolean;
  archived_at?: Date;
  archived_reason?: string;
  posted_at?: Date;
  scheduled_for?: Date;
  post_url?: string;
}