import { createClient } from '@supabase/supabase-js';

// These will be replaced with actual values in production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Database features will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  user_id: string;
  source_post_id?: string;
  idea_text: string;
  hook?: string;
  key_points?: string[];
  target_audience?: string;
  content_format?: string;
  status: 'draft' | 'ideation' | 'approved' | 'rejected';
  llm_provider?: 'gemini' | 'claude' | 'gpt4' | 'manual';
  created_at: Date;
  updated_at: Date;
}

export interface GeneratedContent {
  id: string;
  idea_id: string;
  user_id: string;
  variant_number: number;
  content_text: string;
  hook: string;
  hashtags?: string[];
  estimated_read_time?: number;
  llm_provider: 'gemini' | 'claude' | 'gpt4';
  llm_model?: string;
  generation_prompt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  revision_notes?: string;
  approved_at?: Date;
  approved_by?: string;
  created_at: Date;
  updated_at: Date;
}