// =====================================================
// MULTI-USER SYSTEM TYPES
// TypeScript interfaces for the enhanced system
// =====================================================

export interface UserPromptOverride {
  id: string;
  client_id: string;
  base_prompt_id: string;
  customized_system_message: string;
  customized_settings: {
    temperature?: number;
    max_tokens?: number;
    [key: string]: any;
  };
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AdminSession {
  id: string;
  admin_user_id: string;
  active_client_id?: string;
  switched_at: Date;
  session_data: {
    last_prompts_used?: string[];
    content_generated_count?: number;
    [key: string]: any;
  };
}

export interface EnhancedClient {
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
  // NEW FIELDS
  user_id?: string;
  portal_access: boolean;
  mobile_pin?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EnhancedGeneratedContent {
  id: string;
  idea_id?: string;
  client_id?: string;
  ghostwriter_id?: string;
  variant_number: number;
  content_text: string;
  hook: string;
  hashtags: string[];
  estimated_read_time?: number;
  character_count?: number;
  llm_provider: 'openai' | 'anthropic' | 'google';
  llm_model?: string;
  generation_prompt?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_cost?: number;
  temperature?: number;
  status: 'draft' | 'admin_approved' | 'admin_rejected' | 'client_approved' | 'client_rejected' | 'revision_requested' | 'scheduled' | 'published';
  revision_notes?: string;
  approved_at?: Date;
  approved_by?: string;
  performance_prediction?: any;
  // NEW FIELDS
  prompt_override_id?: string;
  base_prompt_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClientPromptOverview {
  client_id: string;
  client_name: string;
  company: string;
  prompt_id: string;
  prompt_name: string;
  category: string;
  prompt_status: 'customized' | 'default';
  override_id?: string;
  last_customized?: Date;
}

export interface PersonalizedPromptResult {
  prompt_id: string;
  system_message: string;
  settings: {
    temperature?: number;
    max_tokens?: number;
    [key: string]: any;
  };
  is_customized: boolean;
}

export interface ClientSwitchContext {
  activeClient?: EnhancedClient;
  availableClients: EnhancedClient[];
  switchToClient: (clientId: string) => Promise<void>;
  clearActiveClient: () => void;
  isLoading: boolean;
  error?: string;
}

export interface PromptPersonalization {
  clientId: string;
  overrides: UserPromptOverride[];
  createOverride: (basePromptId: string, customization: Partial<UserPromptOverride>) => Promise<UserPromptOverride>;
  updateOverride: (overrideId: string, updates: Partial<UserPromptOverride>) => Promise<boolean>;
  deleteOverride: (overrideId: string) => Promise<boolean>;
  getPersonalizedPrompt: (basePromptId: string) => Promise<PersonalizedPromptResult>;
}

export interface MobileApprovalContent {
  id: string;
  content_text: string;
  hook: string;
  hashtags: string[];
  client_name: string;
  company: string;
  created_at: Date;
  estimated_read_time?: number;
  character_count?: number;
}

export interface MobileApprovalAction {
  contentId: string;
  action: 'approve' | 'reject' | 'request_revision';
  notes?: string;
  voice_note_url?: string;
  timestamp: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ClientPromptsResponse {
  client: EnhancedClient;
  prompts: ClientPromptOverview[];
  total_prompts: number;
  customized_count: number;
}

export interface GenerationRequest {
  client_id: string;
  content_idea: string;
  number_of_variations?: number;
  variation_strategy?: 'same-prompt' | 'different-prompts' | 'mixed-category';
  specific_prompt_ids?: string[];
  urls?: string[];
}

export interface GenerationResponse {
  success: boolean;
  content: EnhancedGeneratedContent[];
  prompts_used: {
    prompt_id: string;
    prompt_name: string;
    was_customized: boolean;
    override_id?: string;
  }[];
  total_tokens: number;
  total_cost: number;
  processing_time_ms: number;
}

// Mobile PWA types
export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface MobileNotificationPermission {
  granted: boolean;
  request: () => Promise<NotificationPermission>;
  subscribe: (vapidKey: string) => Promise<PushSubscription>;
}

export interface MobileAuthOptions {
  pin_auth: boolean;
  biometric_auth: boolean;
  remember_device: boolean;
  session_timeout_hours: number;
}

// Analytics types for multi-user
export interface ClientAnalytics {
  client_id: string;
  client_name: string;
  content_generated: number;
  approval_rate: number;
  average_approval_time_hours: number;
  top_performing_prompts: {
    prompt_name: string;
    usage_count: number;
    avg_engagement: number;
  }[];
  prompt_customization_stats: {
    total_prompts: number;
    customized_prompts: number;
    customization_rate: number;
  };
  mobile_usage: {
    total_approvals: number;
    mobile_approvals: number;
    mobile_usage_rate: number;
  };
}

// Export all types for easy importing
// (Types are already exported inline above)