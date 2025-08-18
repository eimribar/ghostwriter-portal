import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Sparkles, 
  MessageSquare, 
  Edit3,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  TrendingUp,
  ArrowRight,
  Clock,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { contentIdeasService, type ContentIdeaDB } from '../services/database.service';
import { searchJobsService, type SearchJob } from '../services/search-jobs.service';
import { supabase } from '../lib/supabase';

interface IdeaWithUI extends ContentIdeaDB {
  selected?: boolean;
}

const Ideation = () => {
  const [ideas, setIdeas] = useState<IdeaWithUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithUI | null>(null);
  const [activeJobs, setActiveJobs] = useState<SearchJob[]>([]);
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Load ideas on mount
  useEffect(() => {
    loadIdeas();
    checkActiveJobs();
    const interval = setInterval(checkActiveJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const fetchedIdeas = await contentIdeasService.getAll();
      
      // CLIENT-SIDE FILTER: Remove any system messages that got through
      const cleanIdeas = (fetchedIdeas || []).filter(idea => {
        const titleLower = idea.title.toLowerCase();
        const descLower = (idea.description || '').toLowerCase();
        
        // Skip if title or description contains system message patterns
        const systemPatterns = [
          'has joined the channel',
          'has left the channel',
          'has renamed the channel',
          'was added to',
          'was removed from'
        ];
        
        const isSystemMessage = systemPatterns.some(pattern => 
          titleLower.includes(pattern) || descLower.includes(pattern)
        );
        
        if (isSystemMessage) {
          console.log(`Filtering out system message: "${idea.title}"`);
          return false;
        }
        
        // Skip if title is just a user ID
        if (idea.title.match(/^<?@?U[A-Z0-9]+>?$/)) {
          return false;
        }
        
        return true;
      });
      
      setIdeas(cleanIdeas);
    } catch (err) {
      console.error('Error loading ideas:', err);
      setError('Failed to load ideas');
    } finally {
      setLoading(false);
    }
  };

  const checkActiveJobs = async () => {
    try {
      const jobs = await searchJobsService.getAll({ status: 'processing' });
      setActiveJobs(jobs || []);
    } catch (err) {
      console.error('Error checking active jobs:', err);
    }
  };

  const handleDeleteIdea = async (ideaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this idea?')) return;
    
    try {
      const { error } = await supabase
        .from('content_ideas')
        .delete()
        .eq('id', ideaId);

      if (error) throw error;
      setIdeas(prev => prev.filter(idea => idea.id !== ideaId));
    } catch (err) {
      console.error('Error deleting idea:', err);
      setError('Failed to delete idea');
    }
  };


  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter ideas based on search and active filter
  const filteredIdeas = ideas.filter(idea => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        idea.title.toLowerCase().includes(query) ||
        idea.description?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Source filter
    if (activeFilter === 'all') return true;
    if (activeFilter === 'news' && idea.source === 'ai' && idea.ai_model === 'gpt-5') return true;
    if (activeFilter === 'ai' && idea.source === 'ai' && idea.ai_model !== 'gpt-5') return true;
    if (activeFilter === 'slack' && idea.source === 'slack') return true;
    return false;
  });

  const getSourceBadge = (idea: ContentIdeaDB) => {
    if (idea.source === 'ai' && idea.ai_model === 'gpt-5') {
      return { label: 'News', icon: TrendingUp, color: 'bg-blue-500' };
    }
    if (idea.source === 'ai') {
      return { label: 'AI', icon: Sparkles, color: 'bg-purple-500' };
    }
    if (idea.source === 'slack') {
      return { label: 'Slack', icon: MessageSquare, color: 'bg-green-500' };
    }
    return { label: 'Manual', icon: Edit3, color: 'bg-gray-500' };
  };

  const filterOptions = [
    { value: 'all', label: 'All Ideas', count: ideas.length },
    { value: 'news', label: 'News & Trends', count: ideas.filter(i => i.source === 'ai' && i.ai_model === 'gpt-5').length },
    { value: 'ai', label: 'AI Generated', count: ideas.filter(i => i.source === 'ai' && i.ai_model !== 'gpt-5').length },
    { value: 'slack', label: 'Slack', count: ideas.filter(i => i.source === 'slack').length }
  ];

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Content Ideas</h1>
              <p className="text-sm text-gray-500 mt-1">Discover and manage your content pipeline</p>
            </div>
            
            <div className="flex items-center gap-3">
              {activeJobs.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">{activeJobs.length} searching</span>
                </div>
              )}
              
              <button
                onClick={() => console.log('Generate AI Ideas clicked')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all font-medium text-sm"
              >
                <Plus className="h-4 w-4" />
                New Idea
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all text-sm"
              />
            </div>
            
            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    activeFilter === option.value 
                      ? "bg-gray-900 text-white" 
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {option.label}
                  {option.count > 0 && (
                    <span className={cn(
                      "ml-2 text-xs",
                      activeFilter === option.value ? "text-gray-300" : "text-gray-400"
                    )}>
                      {option.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No ideas found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Start by generating AI ideas or creating your own'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredIdeas.map(idea => {
              const badge = getSourceBadge(idea);
              const Icon = badge.icon;
              
              return (
                <div
                  key={idea.id}
                  className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 hover:border-gray-200"
                  onClick={() => setSelectedIdea(idea)}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-medium",
                      badge.color
                    )}>
                      <Icon className="h-3 w-3" />
                      {badge.label}
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteIdea(idea.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-lg transition-all"
                      title="Delete idea"
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                  
                  {/* Card Content */}
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
                    {idea.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {idea.description}
                  </p>
                  
                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {idea.slack_user_name && (
                        <span className="font-medium">{idea.slack_user_name}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(idea.created_at)}</span>
                      </div>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  {/* Priority Badge */}
                  {idea.priority === 'high' && (
                    <div className="absolute top-0 right-0 mt-3 mr-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedIdea(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-zinc-900 mb-2">{selectedIdea.title}</h2>
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                  <span>{selectedIdea.source}</span>
                  {selectedIdea.slack_user_name && (
                    <>
                      <span>•</span>
                      <span>{selectedIdea.slack_user_name}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatDate(selectedIdea.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedIdea(null)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="prose prose-zinc max-w-none mb-6">
              <p className="text-zinc-700">{selectedIdea.description}</p>
            </div>

            {selectedIdea.source === 'slack' && selectedIdea.original_message_url && (
              <a
                href={selectedIdea.original_message_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
              >
                <ExternalLink className="h-3 w-3" />
                View in Slack
              </a>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.location.href = `/generate?idea=${selectedIdea.id}`;
                }}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Generate Content
              </button>
              <button
                onClick={() => {
                  handleDeleteIdea(selectedIdea.id, new MouseEvent('click') as any);
                  setSelectedIdea(null);
                }}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-600">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Modals remain the same */}
      {showNewIdeaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Create New Idea</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="Enter idea title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  rows={4}
                  placeholder="Describe your idea..."
                />
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
                onClick={() => setShowNewIdeaModal(false)}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ideation;