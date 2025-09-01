// =====================================================
// YOUTUBE TRANSCRIPT SERVICE
// Client-side service for YouTube transcript processing
// =====================================================

import { supabase } from '../lib/supabase';

export interface YouTubeIdeationRequest {
  videoUrl: string;
  promptId?: string;
}

export interface YouTubeVideoData {
  url: string;
  title: string;
  channel: string;
  transcriptLength: number;
}

export interface YouTubeIdeationResult {
  success: boolean;
  videoData?: YouTubeVideoData;
  promptUsed?: {
    id: string;
    name: string;
  };
  ideas?: any[];
  totalIdeas?: number;
  processing_time_seconds?: number;
  error?: string;
  details?: string;
}

export const youTubeTranscriptService = {
  /**
   * Process YouTube video and generate content ideas
   */
  async processVideo(request: YouTubeIdeationRequest): Promise<YouTubeIdeationResult> {
    try {
      console.log('🎬 Starting YouTube video processing:', request.videoUrl);
      
      // Validate YouTube URL
      if (!this.isValidYouTubeUrl(request.videoUrl)) {
        return {
          success: false,
          error: 'Please provide a valid YouTube URL'
        };
      }

      // Use relative API path that works for all deployments
      const apiUrl = '/api/youtube-ideation';

      console.log('🚀 Calling YouTube ideation API...');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: request.videoUrl,
          promptId: request.promptId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `API call failed with status ${response.status}` 
        }));
        
        console.error('❌ YouTube API error:', errorData);
        return {
          success: false,
          error: errorData.error || 'Failed to process YouTube video',
          details: errorData.details
        };
      }

      const result: YouTubeIdeationResult = await response.json();
      
      if (result.success) {
        console.log('✅ YouTube processing complete:', result.totalIdeas, 'ideas generated');
      } else {
        console.error('❌ YouTube processing failed:', result.error);
      }

      return result;

    } catch (error: any) {
      console.error('❌ YouTube service error:', error);
      return {
        success: false,
        error: error.message || 'Unexpected error occurred',
        details: error.stack
      };
    }
  },

  /**
   * Get YouTube-specific prompts from database
   */
  async getYouTubePrompts(): Promise<any[]> {
    try {
      const { data: prompts, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('category', 'Content Ideation')
        .eq('is_active', true)
        .or('name.ilike.*youtube*,name.ilike.*transcript*,name.ilike.*video*,tags.cs.{youtube}')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching YouTube prompts:', error);
        return [];
      }

      return prompts || [];
    } catch (error) {
      console.error('Error in getYouTubePrompts:', error);
      return [];
    }
  },

  /**
   * Get all Content Ideation prompts (fallback)
   */
  async getAllIdeationPrompts(): Promise<any[]> {
    try {
      const { data: prompts, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('category', 'Content Ideation')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ideation prompts:', error);
        return [];
      }

      return prompts || [];
    } catch (error) {
      console.error('Error in getAllIdeationPrompts:', error);
      return [];
    }
  },

  /**
   * Get recent YouTube-sourced ideas
   */
  async getRecentYouTubeIdeas(limit: number = 20): Promise<any[]> {
    try {
      const { data: ideas, error } = await supabase
        .from('content_ideas')
        .select('*')
        .eq('source', 'youtube')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching YouTube ideas:', error);
        return [];
      }

      return ideas || [];
    } catch (error) {
      console.error('Error in getRecentYouTubeIdeas:', error);
      return [];
    }
  },

  /**
   * Validate YouTube URL format
   */
  isValidYouTubeUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // YouTube URL patterns
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/
    ];

    return patterns.some(pattern => pattern.test(url.trim()));
  },

  /**
   * Extract video ID from YouTube URL
   */
  extractVideoId(url: string): string | null {
    if (!this.isValidYouTubeUrl(url)) {
      return null;
    }

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  },

  /**
   * Create YouTube thumbnail URL
   */
  getThumbnailUrl(videoUrl: string): string | null {
    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) {
      return null;
    }

    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  },

  /**
   * Format video URL for consistent storage
   */
  formatVideoUrl(url: string): string {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      return url; // Return original if can't parse
    }

    return `https://www.youtube.com/watch?v=${videoId}`;
  }
};