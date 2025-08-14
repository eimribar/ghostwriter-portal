import { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, Brain, Zap, Plus, Star, Clock, Filter, Search, ChevronRight, Sparkles, Users, BarChart, Loader2, AlertCircle, Newspaper, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { contentIdeasService, type ContentIdeaDB } from '../services/database.service';
import { gpt5IdeationService } from '../services/gpt5-ideation.service';

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
  

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithUI | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
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
    count: 10
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
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedIdeas = await contentIdeasService.getAll();
      setIdeas(fetchedIdeas as IdeaWithUI[]);
    } catch (err) {
      console.error('Error loading ideas:', err);
      setError('Failed to load content ideas');
    } finally {
      setLoading(false);
    }
  };

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = !searchQuery || 
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || idea.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || idea.status === selectedStatus;
    const matchesClient = selectedClient === 'all' || idea.client_id === selectedClient;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesClient;
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

  const handleGenerateNewsIdeas = async () => {
    // Fixed query for testing B2B SaaS, AI, and Marketing trends
    const testQuery = "top 10 trending topics news B2B SaaS AI marketing enterprise software";

    setGenerating(true);
    setError(null);
    
    try {
      // Generate ideas from trending news with fixed query
      const generatedIdeas = await gpt5IdeationService.generateIdeasFromNews(
        testQuery,  // Using fixed query for now
        {
          count: 10,  // Always get 10 ideas
          timeframe: 'week',  // Past week of news
          industry: 'B2B SaaS',
          targetAudience: 'B2B professionals, SaaS founders, Marketing leaders'
        }
      );

      // Convert and save to database
      const ideaPromises = generatedIdeas.map(async (genIdea) => {
        return contentIdeasService.create({
          source: 'trending',
          title: genIdea.title,
          description: genIdea.description,
          hook: genIdea.hook,
          key_points: genIdea.keyPoints,
          target_audience: genIdea.targetAudience,
          content_format: genIdea.contentFormat,
          category: genIdea.category,
          priority: genIdea.engagementScore >= 9 ? 'high' : 'medium',
          status: 'ready',
          score: genIdea.engagementScore,
          ai_model: 'gpt-5',
          ai_reasoning_effort: 'high',
          linkedin_style: genIdea.linkedInStyle,
          hashtags: genIdea.tags,
          trend_reference: `News search: ${newsSearchOptions.query}`
        });
      });

      const savedIdeas = await Promise.all(ideaPromises);
      const validIdeas = savedIdeas.filter(Boolean) as IdeaWithUI[];
      
      setIdeas([...validIdeas, ...ideas]);
      setShowNewsModal(false);
      setNewsSearchOptions(prev => ({ ...prev, query: '' }));
      
    } catch (err) {
      console.error('Error generating news-based ideas:', err);
      setError('Failed to generate news-based ideas. Please try again.');
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
      // Generate ideas using GPT-5
      const generatedIdeas = await gpt5IdeationService.generateIdeas(
        aiGenerationOptions.topic,
        {
          count: aiGenerationOptions.count,
          mode: aiGenerationOptions.mode,
          industry: aiGenerationOptions.industry,
          targetAudience: aiGenerationOptions.targetAudience,
          useTools: true
        }
      );

      // Convert and save to database
      const ideaPromises = generatedIdeas.map(async (genIdea) => {
        return contentIdeasService.create({
          source: 'ai',
          title: genIdea.title,
          description: genIdea.description,
          hook: genIdea.hook,
          key_points: genIdea.keyPoints,
          target_audience: genIdea.targetAudience,
          content_format: genIdea.contentFormat,
          category: genIdea.category,
          priority: genIdea.engagementScore >= 8 ? 'high' : genIdea.engagementScore >= 6 ? 'medium' : 'low',
          status: 'ready',
          score: genIdea.engagementScore,
          ai_model: 'gpt-5',
          ai_reasoning_effort: aiGenerationOptions.mode === 'comprehensive' ? 'high' : 'medium',
          linkedin_style: genIdea.linkedInStyle,
          hashtags: genIdea.tags
        });
      });

      const savedIdeas = await Promise.all(ideaPromises);
      const validIdeas = savedIdeas.filter(Boolean) as IdeaWithUI[];
      
      setIdeas([...validIdeas, ...ideas]);
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
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
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
                    From {selectedIdea.source.replace('-', ' ')}
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
                  <strong>Note:</strong> GPT-5 will analyze trends, competitors, and generate high-quality content ideas optimized for LinkedIn engagement.
                  {!gpt5IdeationService.isConfigured() && (
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-6 w-6 text-zinc-900" />
                <h2 className="text-xl font-bold text-zinc-900">Generate Ideas from Trending News</h2>
              </div>
              <button 
                onClick={() => setShowNewsModal(false)}
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
                  <strong>💡 Pro Tip:</strong> News-based content gets 3x more engagement when posted within 24-48 hours of breaking news. 
                  Act fast on these ideas!
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching News...
                  </>
                ) : (
                  <>
                    <Newspaper className="h-4 w-4" />
                    Generate from News
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ideation;