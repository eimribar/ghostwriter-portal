import { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, Brain, Zap, Plus, Star, Clock, Filter, Search, ChevronRight, Sparkles, Users, BarChart, Loader2, AlertCircle, Newspaper, Globe, Mail, CheckCircle, MessageSquare, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { contentIdeasService, type ContentIdeaDB } from '../services/database.service';
import { gpt5ResponsesService } from '../services/gpt5-responses.service';
import { searchJobsService, type SearchJob } from '../services/search-jobs.service';
import { supabase } from '../lib/supabase';

// Using ContentIdeaDB from database service
interface IdeaWithUI extends ContentIdeaDB {
  linkedPost?: {
    creator: string;
    snippet: string;
    reactions: number;
  };
}

const Ideation = () => {
  const [ideas, setIdeas] = useState<IdeaWithUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<SearchJob[]>([]);
  const [showJobsPanel, setShowJobsPanel] = useState(false);
  

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithUI | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [aiGenerationOptions, setAiGenerationOptions] = useState({
    count: 5,
    mode: 'comprehensive' as 'comprehensive' | 'quick' | 'trend_focused' | 'news_focused',
    industry: 'technology',
    targetAudience: 'B2B professionals',
    topic: ''
  });
  const [newsSearchOptions, setNewsSearchOptions] = useState({
    query: '',
    timeframe: 'week' as 'today' | 'week' | 'month',
    count: 10,
    topics: ['B2B SaaS', 'AI', 'Marketing'] as string[]
  });

  // New idea form state
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    client: '',
    priority: 'medium' as 'high' | 'medium' | 'low'
  });

  const categories = ['Startup Culture', 'Product Management', 'Build in Public', 'AI & Tech', 'Leadership', 'Growth', 'HR & Culture', 'Marketing', 'Sales'];
  const clients = ['Amnon Cohen', 'Sarah Chen', 'Marcus Johnson'];
  
  // Helper function to get client name (in production, would map from database)
  const getClientName = (clientId: string | undefined) => {
    if (!clientId) return '';
    // Mock mapping - in production, would fetch from clients table
    const clientMap: Record<string, string> = {
      '1': 'Amnon Cohen',
      '2': 'Sarah Chen', 
      '3': 'Marcus Johnson'
    };
    return clientMap[clientId] || clientId;
  };

  // Load ideas from database on mount
  useEffect(() => {
    console.log('🔐 === GPT-5 Configuration Check ===');
    console.log('- Service configured:', gpt5ResponsesService.isConfigured());
    console.log('- API Key exists:', !!import.meta.env.VITE_OPENAI_API_KEY);
    console.log('- API Key (first 20 chars):', import.meta.env.VITE_OPENAI_API_KEY?.substring(0, 20) + '...');
    console.log('- Model:', import.meta.env.VITE_GPT5_MODEL || 'gpt-5 (default)');
    console.log('🔐 === End Configuration Check ===');
    
    loadIdeas();
    loadActiveJobs();
    
    // Poll for active jobs every 30 seconds
    const interval = setInterval(() => {
      loadActiveJobs();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📥 Loading ideas from database...');
      const fetchedIdeas = await contentIdeasService.getAll();
      console.log('📊 Fetched ideas:', fetchedIdeas.length, fetchedIdeas);
      setIdeas(fetchedIdeas as IdeaWithUI[]);
    } catch (err) {
      console.error('❌ Error loading ideas:', err);
      setError('Failed to load content ideas');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveJobs = async () => {
    try {
      const jobs = await searchJobsService.getPendingJobs();
      setActiveJobs(jobs);
    } catch (err) {
      console.error('Error loading active jobs:', err);
    }
  };

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = !searchQuery || 
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || idea.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || idea.status === selectedStatus;
    const matchesClient = selectedClient === 'all' || idea.client_id === selectedClient;
    const matchesSource = selectedSource === 'all' || idea.source === selectedSource;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesClient && matchesSource;
  });

  const handleCreateIdea = async () => {
    if (!newIdea.title || !newIdea.description) return;

    try {
      const idea = await contentIdeasService.create({
        title: newIdea.title,
        description: newIdea.description,
        source: 'manual',
        category: newIdea.category || 'General',
        client_id: undefined, // Would need to map client name to ID
        priority: newIdea.priority,
        status: 'draft',
        score: undefined,
        hashtags: newIdea.tags.split(',').map(t => t.trim()).filter(Boolean)
      });

      if (idea) {
        setIdeas([idea as IdeaWithUI, ...ideas]);
        setShowNewIdeaModal(false);
        setNewIdea({
          title: '',
          description: '',
          category: '',
          tags: '',
          client: '',
          priority: 'medium'
        });
      }
    } catch (err) {
      console.error('Error creating idea:', err);
      setError('Failed to create idea');
    }
  };

  // Manual function to check and send pending email notifications
  const checkAndSendPendingEmails = async () => {
    console.log('📧 Checking for pending email notifications...');
    
    // Show loading state
    setError(null);
    
    try {
      // Determine the API URL
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5173/api/check-and-notify'
        : '/api/check-and-notify';
        
      console.log('📡 Calling:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('📬 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Email check complete:', result);
        
        if (result.notificationsSent > 0) {
          console.log(`📧 Sent ${result.notificationsSent} email(s)`);
          // Reload active jobs to update status
          await loadActiveJobs();
          // Show success message
          setError(`✅ Successfully sent ${result.notificationsSent} email notification(s)`);
          setTimeout(() => setError(null), 5000);
        } else {
          console.log('📭 No pending emails to send');
          setError('ℹ️ No pending email notifications to send');
          setTimeout(() => setError(null), 3000);
        }
      } else {
        const errorData = await response.text();
        console.error('❌ API Error:', errorData);
        setError('Failed to check emails. Check console for details.');
      }
    } catch (err) {
      console.error('❌ Failed to check pending emails:', err);
      setError('Error checking emails. See console for details.');
    }
  };

  const handleGenerateNewsIdeas = async () => {
    console.log('🚀 === STARTING BACKGROUND NEWS SEARCH ===');
    
    // Your exact query for finding real news
    const searchQuery = "find me the top 10 trending topics (news) with context related to b2b saas, ai and marketing. actual news from the past week";
    console.log('📝 Search Query:', searchQuery);

    setGenerating(true);
    setError(null);
    
    try {
      // Create a background search job
      const searchJob = await searchJobsService.create(searchQuery, {
        topics: newsSearchOptions.topics || ['B2B SaaS', 'AI', 'Marketing'],
        industry: 'B2B SaaS',
        targetAudience: 'B2B professionals, SaaS founders, Marketing leaders',
        count: 10,
        mode: 'news_search'
      });

      if (!searchJob) {
        throw new Error('Failed to create search job');
      }

      console.log('✅ Search job created:', searchJob.id);
      
      // Immediately trigger processing via API
      console.log('🔄 Triggering API to process search job...');
      
      // Determine the API URL
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5173/api/process-search'
        : '/api/process-search';
        
      // Call the API to process the job immediately
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: searchJob.id })
      })
      .then(response => {
        if (response.ok) {
          console.log('✅ Search processing triggered successfully');
          return response.json();
        } else {
          console.error('❌ Failed to trigger search processing:', response.status);
        }
      })
      .then(data => {
        if (data) {
          console.log('📊 Processing response:', data);
        }
      })
      .catch(error => {
        console.error('❌ Error triggering search:', error);
        // The background processor will pick it up eventually
        console.log('⏰ Background processor will handle it in next cycle');
      });

      // Show confirmation state in modal
      setShowConfirmation(true);
      setError(null);
      
      // Auto-close modal after 5 seconds
      setTimeout(() => {
        setShowNewsModal(false);
        setShowConfirmation(false);
        setNewsSearchOptions(prev => ({ ...prev, query: '' }));
      }, 5000);
      
      // Also trigger email notification after a delay (backup method)
      setTimeout(async () => {
        try {
          // Check if job completed and send email
          const { data: updatedJob } = await supabase
            .from('search_jobs')
            .select('*')
            .eq('id', searchJob.id)
            .single();
          
          if (updatedJob && updatedJob.status === 'completed' && !updatedJob.notification_sent) {
            // Send email via API
            const emailResponse = await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobId: searchJob.id,
                searchQuery: searchQuery,
                resultCount: updatedJob.result_count || 10,
                duration: '2-5 minutes'
              })
            });
            
            if (emailResponse.ok) {
              // Mark notification as sent
              await supabase
                .from('search_jobs')
                .update({ notification_sent: true })
                .eq('id', searchJob.id);
              
              console.log('📧 Email notification sent successfully');
            }
          }
        } catch (err) {
          console.log('Email notification will be sent by background processor');
        }
      }, 300000); // Check after 5 minutes
      
    } catch (err) {
      console.error('❌ ERROR:', err);
      setError('Failed to start background search. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAIIdeas = async () => {
    if (!aiGenerationOptions.topic) {
      setError('Please enter a topic for idea generation');
      return;
    }

    setGenerating(true);
    setError(null);
    
    try {
      let generatedIdeas;
      
      // Use Responses API for news-focused mode, otherwise use regular generation
      if (aiGenerationOptions.mode === 'news_focused') {
        console.log('Using GPT-5 Responses API with Web Search for news-focused mode');
        generatedIdeas = await gpt5ResponsesService.searchAndGenerateIdeas(
          aiGenerationOptions.topic,
          {
            count: aiGenerationOptions.count,
            timeframe: 'week',
            industry: aiGenerationOptions.industry,
            targetAudience: aiGenerationOptions.targetAudience
          }
        );
      } else {
        // For non-news modes, we'll also use the Responses API for consistency
        console.log('Using GPT-5 Responses API for idea generation');
        generatedIdeas = await gpt5ResponsesService.searchAndGenerateIdeas(
          aiGenerationOptions.topic,
          {
            count: aiGenerationOptions.count,
            timeframe: 'week',
            industry: aiGenerationOptions.industry,
            targetAudience: aiGenerationOptions.targetAudience
          }
        );
      }

      // Convert and save to database
      const ideaPromises = generatedIdeas.map(async (genIdea) => {
        const ideaData = {
          source: 'ai' as const,
          title: genIdea.title,
          description: genIdea.description,
          hook: genIdea.hook,
          key_points: genIdea.keyPoints,
          target_audience: genIdea.targetAudience,
          content_format: genIdea.contentFormat,
          category: genIdea.category,
          priority: (genIdea.engagementScore >= 8 ? 'high' : genIdea.engagementScore >= 6 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
          status: 'ready' as const,
          score: genIdea.engagementScore,
          ai_model: 'gpt-5',
          ai_reasoning_effort: (aiGenerationOptions.mode === 'comprehensive' ? 'high' : 'medium') as 'high' | 'medium' | 'low',
          linkedin_style: genIdea.linkedInStyle,
          hashtags: genIdea.tags
        };
        
        console.log('💾 Attempting to save idea:', genIdea.title);
        const saved = await contentIdeasService.create(ideaData);
        if (!saved) {
          console.error('❌ Failed to save idea:', genIdea.title);
        }
        return saved;
      });

      const savedIdeas = await Promise.all(ideaPromises);
      const validIdeas = savedIdeas.filter(Boolean);
      console.log('✅ Ideas saved:', validIdeas.length, 'out of', generatedIdeas.length);
      
      if (validIdeas.length === 0) {
        throw new Error('Failed to save any ideas to database. Check console for details.');
      }
      
      // Reload all ideas from database to ensure UI is in sync
      await loadIdeas();
      setShowAIModal(false);
      setAiGenerationOptions(prev => ({ ...prev, topic: '' }));
      
    } catch (err) {
      console.error('Error generating AI ideas:', err);
      setError('Failed to generate AI ideas. Please check your OpenAI API key.');
    } finally {
      setGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ready': return 'text-green-600 bg-green-50';
      case 'in-progress': return 'text-blue-600 bg-blue-50';
      case 'draft': return 'text-gray-600 bg-gray-50';
      case 'used': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSourceIcon = (source: string) => {
    switch(source) {
      case 'trending': return <TrendingUp className="h-4 w-4" />;
      case 'ai': return <Sparkles className="h-4 w-4" />;
      case 'manual': return <Lightbulb className="h-4 w-4" />;
      case 'content-lake': return <BarChart className="h-4 w-4" />;
      case 'slack': return <MessageSquare className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex-1 bg-zinc-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Content Ideation</h1>
            <p className="text-zinc-600 mt-1">Discover, create, and manage content ideas</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowNewsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Newspaper className="h-4 w-4" />
              )}
              News & Trends
            </button>
            <button 
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              Generate AI Ideas
            </button>
            <button 
              onClick={() => setShowNewIdeaModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Idea
            </button>
            
            {/* Active Jobs Indicator */}
            {activeJobs.length > 0 && (
              <button
                onClick={() => setShowJobsPanel(!showJobsPanel)}
                className="relative flex items-center gap-2 px-4 py-2 bg-purple-100 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                {activeJobs.length} search{activeJobs.length > 1 ? 'es' : ''} running
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-purple-500 rounded-full animate-pulse" />
              </button>
            )}
            
            {/* Manual Email Check Button */}
            <button
              onClick={checkAndSendPendingEmails}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              title="Check for completed searches and send email notifications"
            >
              <Mail className="h-4 w-4" />
              Check Emails
            </button>
          </div>
        </div>
        
        {/* Active Jobs Panel */}
        {showJobsPanel && activeJobs.length > 0 && (
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-purple-900">Active Searches</h3>
              <button
                onClick={() => setShowJobsPanel(false)}
                className="text-purple-600 hover:text-purple-800"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {activeJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {job.search_query.length > 80 
                          ? job.search_query.substring(0, 80) + '...'
                          : job.search_query}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Started {new Date(job.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-purple-600">
                    <Mail className="h-3 w-3" />
                    Email notification pending
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Total Ideas</p>
                <p className="text-2xl font-bold text-zinc-900">{ideas.length}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-zinc-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Ready to Use</p>
                <p className="text-2xl font-bold text-green-600">
                  {ideas.filter(i => i.status === 'ready').length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-green-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">
                  {ideas.filter(i => i.priority === 'high').length}
                </p>
              </div>
              <Star className="h-8 w-8 text-red-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">From Slack</p>
                <p className="text-2xl font-bold text-purple-600">
                  {ideas.filter(i => i.source === 'slack').length}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Trending</p>
                <p className="text-2xl font-bold text-blue-600">
                  {ideas.filter(i => i.source === 'trending').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-300" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="in-progress">In Progress</option>
              <option value="used">Used</option>
            </select>

            <select 
              value={selectedSource} 
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="all">All Sources</option>
              <option value="manual">Manual</option>
              <option value="ai">AI Generated</option>
              <option value="slack">Slack</option>
              <option value="trending">Trending</option>
              <option value="content-lake">Content Lake</option>
            </select>

            <select 
              value={selectedClient} 
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
              <Filter className="h-4 w-4" />
              More
            </button>
          </div>
        </div>
      </div>

      {/* Ideas Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-20">
          <Lightbulb className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">No ideas found</h3>
          <p className="text-zinc-600 mb-4">
            {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' 
              ? 'Try adjusting your filters or search query'
              : 'Start by generating AI ideas or creating your own'}
          </p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => setShowAIModal(true)}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Generate AI Ideas
            </button>
            <button 
              onClick={() => setShowNewIdeaModal(true)}
              className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Create Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredIdeas.map(idea => (
          <div 
            key={idea.id}
            onClick={() => setSelectedIdea(idea)}
            className="bg-white rounded-lg border border-zinc-200 p-5 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getSourceIcon(idea.source)}
                <span className={cn("px-2 py-1 rounded text-xs font-medium", getPriorityColor(idea.priority))}>
                  {idea.priority.toUpperCase()}
                </span>
                <span className={cn("px-2 py-1 rounded text-xs font-medium", getStatusColor(idea.status))}>
                  {idea.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>
              {idea.score && (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-zinc-700">{idea.score}</span>
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                </div>
              )}
            </div>

            <h3 className="font-semibold text-zinc-900 mb-2">{idea.title}</h3>
            <p className="text-sm text-zinc-600 mb-3 line-clamp-2">{idea.description}</p>

            {idea.linkedPost && (
              <div className="bg-zinc-50 rounded p-2 mb-3">
                <p className="text-xs text-zinc-500 mb-1">Inspired by {idea.linkedPost.creator}</p>
                <p className="text-xs text-zinc-700 italic line-clamp-2">"{idea.linkedPost.snippet}"</p>
                <p className="text-xs text-zinc-500 mt-1">{idea.linkedPost.reactions} reactions</p>
              </div>
            )}
            
            {idea.source === 'slack' && idea.slack_user_name && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-900">
                        {idea.slack_user_name}
                      </p>
                      <p className="text-xs text-purple-600">
                        {idea.notes || 'From Slack'}
                      </p>
                    </div>
                  </div>
                  {idea.original_message_url && (
                    <a 
                      href={idea.original_message_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View in Slack
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {(idea.hashtags || []).slice(0, 3).map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-1 bg-zinc-100 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
              {idea.client_id && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {getClientName(idea.client_id)}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(idea.created_at).toLocaleDateString()}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Generate content from this idea
                }}
                className="text-xs px-2 py-1 bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors flex items-center gap-1"
              >
                Generate
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* New Idea Modal */}
      {showNewIdeaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Create New Idea</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({...newIdea, title: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="Enter idea title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                <textarea
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({...newIdea, description: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 h-24 resize-none"
                  placeholder="Describe the idea..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
                  <select
                    value={newIdea.category}
                    onChange={(e) => setNewIdea({...newIdea, category: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Client</label>
                  <select
                    value={newIdea.client}
                    onChange={(e) => setNewIdea({...newIdea, client: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">Select client...</option>
                    {clients.map(client => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newIdea.tags}
                  onChange={(e) => setNewIdea({...newIdea, tags: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="startup, growth, product..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Priority</label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map(priority => (
                    <button
                      key={priority}
                      onClick={() => setNewIdea({...newIdea, priority: priority as any})}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg border transition-colors",
                        newIdea.priority === priority
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                      )}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowNewIdeaModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIdea}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Create Idea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedIdea(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-3xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{selectedIdea.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  {getSourceIcon(selectedIdea.source)}
                  <span className="text-sm text-zinc-500">
                    From {selectedIdea.source === 'slack' && selectedIdea.slack_user_name 
                      ? `${selectedIdea.slack_user_name} via Slack`
                      : selectedIdea.source.replace('-', ' ')}
                  </span>
                  <span className={cn("px-2 py-1 rounded text-xs font-medium", getPriorityColor(selectedIdea.priority))}>
                    {selectedIdea.priority.toUpperCase()}
                  </span>
                  <span className={cn("px-2 py-1 rounded text-xs font-medium", getStatusColor(selectedIdea.status))}>
                    {selectedIdea.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedIdea(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <p className="text-zinc-700 mb-4">{selectedIdea.description}</p>

            {selectedIdea.linkedPost && (
              <div className="bg-zinc-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-zinc-700 mb-2">Inspiration from {selectedIdea.linkedPost.creator}</p>
                <p className="text-sm text-zinc-600 italic">"{selectedIdea.linkedPost.snippet}"</p>
                <p className="text-sm text-zinc-500 mt-2">{selectedIdea.linkedPost.reactions} reactions</p>
              </div>
            )}
            
            {selectedIdea.source === 'slack' && selectedIdea.slack_user_name && (
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-700 mb-1">
                      Submitted by {selectedIdea.slack_user_name}
                    </p>
                    {selectedIdea.notes && (
                      <p className="text-sm text-purple-600">{selectedIdea.notes}</p>
                    )}
                    {selectedIdea.original_message_url && (
                      <a 
                        href={selectedIdea.original_message_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-500 hover:text-purple-700 underline mt-2 inline-block"
                      >
                        View original message in Slack →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {(selectedIdea.hashtags || []).map((tag: string) => (
                <span key={tag} className="px-3 py-1 bg-zinc-100 rounded text-sm">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span>Category: {selectedIdea.category}</span>
                {selectedIdea.client_id && <span>Client: {getClientName(selectedIdea.client_id)}</span>}
                <span>Created: {new Date(selectedIdea.created_at).toLocaleDateString()}</span>
              </div>
              <button className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
                Generate Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Generate AI Ideas with GPT-5</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Topic *</label>
                <input
                  type="text"
                  value={aiGenerationOptions.topic}
                  onChange={(e) => setAiGenerationOptions({...aiGenerationOptions, topic: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="e.g., AI in healthcare, remote work productivity..."
                  disabled={generating}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Generation Mode</label>
                  <select
                    value={aiGenerationOptions.mode}
                    onChange={(e) => setAiGenerationOptions({...aiGenerationOptions, mode: e.target.value as any})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    disabled={generating}
                  >
                    <option value="comprehensive">Comprehensive (High Quality)</option>
                    <option value="quick">Quick (Fast Generation)</option>
                    <option value="trend_focused">Trend Focused</option>
                    <option value="news_focused">News & Breaking Topics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Number of Ideas</label>
                  <select
                    value={aiGenerationOptions.count}
                    onChange={(e) => setAiGenerationOptions({...aiGenerationOptions, count: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    disabled={generating}
                  >
                    <option value="3">3 Ideas</option>
                    <option value="5">5 Ideas</option>
                    <option value="10">10 Ideas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={aiGenerationOptions.industry}
                    onChange={(e) => setAiGenerationOptions({...aiGenerationOptions, industry: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="e.g., Technology, Healthcare..."
                    disabled={generating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Target Audience</label>
                  <input
                    type="text"
                    value={aiGenerationOptions.targetAudience}
                    onChange={(e) => setAiGenerationOptions({...aiGenerationOptions, targetAudience: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="e.g., B2B professionals, Startup founders..."
                    disabled={generating}
                  />
                </div>
              </div>

              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-600">
                  <strong>Note:</strong> GPT-5 with web search will find real news and generate high-quality content ideas optimized for LinkedIn engagement.
                  {!gpt5ResponsesService.isConfigured() && (
                    <span className="block mt-1 text-amber-600">
                      ⚠️ OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your environment variables.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                disabled={generating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateAIIdeas}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                disabled={generating || !aiGenerationOptions.topic}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Ideas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* News Search Modal */}
      {showNewsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            {!showConfirmation ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-6 w-6 text-zinc-900" />
                    <h2 className="text-xl font-bold text-zinc-900">Generate Ideas from Trending News</h2>
                  </div>
                  <button 
                    onClick={() => {
                      setShowNewsModal(false);
                      setShowConfirmation(false);
                    }}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    ✕
                  </button>
                </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="bg-zinc-50 rounded-lg p-4">
                <h3 className="font-medium text-zinc-900 mb-2">Searching for trending news about:</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-sm">B2B SaaS</span>
                  <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-sm">Artificial Intelligence</span>
                  <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-sm">Marketing Technology</span>
                  <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-sm">Enterprise Software</span>
                </div>
                <p className="text-sm text-zinc-600 mt-3">
                  We'll find the top 10 trending topics and news from the <strong>past week</strong> related to these areas.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">How it works</p>
                    <ul className="text-xs text-blue-700 mt-1 space-y-1">
                      <li>• Searches for the hottest news about your topic</li>
                      <li>• Analyzes trending discussions and breaking stories</li>
                      <li>• Generates timely content ideas with news hooks</li>
                      <li>• Perfect for newsjacking and real-time commentary</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>💡 Pro Tip:</strong> This will search REAL web news and may take 2-5 minutes. 
                  News-based content gets 3x more engagement when posted within 24-48 hours of breaking news!
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowNewsModal(false);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                disabled={generating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateNewsIdeas}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                disabled={generating}
              >
                {generating ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Starting Search...
                  </>
                ) : (
                  <>
                    <Newspaper className="h-4 w-4" />
                    Start Background Search
                  </>
                )}
              </button>
            </div>
              </>
            ) : (
              /* Confirmation View */
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 mb-2">
                    Your search is running in the background!
                  </h2>
                  <p className="text-zinc-600 mb-4">
                    We're gathering trending news and content ideas for you
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <div className="space-y-2 text-left">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-800">
                        <strong>You can close this window</strong> - the search continues in the background
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-800">
                        <strong>Email notification coming</strong> - we'll send results to {import.meta.env.VITE_ADMIN_EMAIL || 'your email'} in 2-5 minutes
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-800">
                        <strong>Ideas will auto-populate</strong> - refresh this page or check back later
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-zinc-50 rounded-lg p-3 mb-6">
                  <p className="text-xs text-zinc-600">
                    💡 <strong>Tip:</strong> Our AI is searching real-time news from the past week about B2B SaaS, AI, and Marketing. 
                    This typically takes 2-5 minutes for comprehensive results.
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setShowNewsModal(false);
                    setShowConfirmation(false);
                    setNewsSearchOptions(prev => ({ ...prev, query: '' }));
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Got it! 👍
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Ideation;