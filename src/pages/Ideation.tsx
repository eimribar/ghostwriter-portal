import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Sparkles, 
  MessageSquare, 
  Newspaper, 
  Edit3,
  Trash2,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  Clock
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['trending', 'ai', 'slack', 'manual']));

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

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
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

  // Group ideas by source
  const groupedIdeas = ideas.reduce((acc, idea) => {
    const source = idea.source || 'manual';
    if (!acc[source]) acc[source] = [];
    acc[source].push(idea);
    return acc;
  }, {} as Record<string, IdeaWithUI[]>);

  // Filter ideas based on search
  const filterIdeas = (ideas: IdeaWithUI[]) => {
    if (!searchQuery) return ideas;
    const query = searchQuery.toLowerCase();
    return ideas.filter(idea => 
      idea.title.toLowerCase().includes(query) ||
      idea.description?.toLowerCase().includes(query)
    );
  };

  const sourceConfig = {
    trending: {
      label: 'News & Trends',
      icon: Newspaper,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    ai: {
      label: 'AI Generated',
      icon: Sparkles,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    slack: {
      label: 'Slack Ideas',
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    manual: {
      label: 'Manual Ideas',
      icon: Edit3,
      color: 'text-zinc-600',
      bgColor: 'bg-zinc-50',
      borderColor: 'border-zinc-200'
    }
  };

  return (
    <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b border-zinc-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Content Ideation</h1>
              <p className="text-sm text-zinc-500 mt-1">Organize and manage your content ideas</p>
            </div>
            
            <div className="flex items-center gap-2">
              {activeJobs.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700">{activeJobs.length} active searches</span>
                </div>
              )}
              
              <button
                onClick={() => console.log('News & Trends clicked')}
                className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <Newspaper className="h-4 w-4" />
                News & Trends
              </button>
              
              <button
                onClick={() => console.log('Generate AI Ideas clicked')}
                className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
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

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-100 rounded-full mb-4">
              <Search className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">No ideas yet</h3>
            <p className="text-zinc-500 mb-6">Start by generating AI ideas or creating your own</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Grouped Sections */}
            {['trending', 'ai', 'slack', 'manual'].map(source => {
              const sourceIdeas = filterIdeas(groupedIdeas[source] || []);
              const config = sourceConfig[source as keyof typeof sourceConfig];
              const Icon = config.icon;
              const isExpanded = expandedSections.has(source);
              
              if (sourceIdeas.length === 0) return null;
              
              return (
                <div key={source} className={cn("rounded-xl border", config.borderColor)}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(source)}
                    className={cn(
                      "w-full px-4 py-3 flex items-center justify-between",
                      config.bgColor,
                      "hover:opacity-90 transition-opacity rounded-t-xl"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-5 w-5", config.color)} />
                      <span className={cn("font-semibold", config.color)}>
                        {config.label}
                      </span>
                      <span className={cn("text-sm px-2 py-0.5 rounded-full bg-white", config.color)}>
                        {sourceIdeas.length}
                      </span>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform",
                      config.color,
                      isExpanded && "rotate-90"
                    )} />
                  </button>
                  
                  {/* Section Content */}
                  {isExpanded && (
                    <div className="divide-y divide-zinc-100">
                      {sourceIdeas.map(idea => (
                        <div
                          key={idea.id}
                          className="px-4 py-3 hover:bg-zinc-50 transition-colors cursor-pointer group"
                          onClick={() => setSelectedIdea(idea)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-zinc-900 mb-1">
                                {idea.title}
                              </h3>
                              <p className="text-sm text-zinc-600 line-clamp-1">
                                {idea.description}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                                {idea.slack_user_name && (
                                  <>
                                    <span>{idea.slack_user_name}</span>
                                    <span>•</span>
                                  </>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(idea.created_at)}
                                </span>
                                {idea.priority === 'high' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-red-600 font-medium">High Priority</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={(e) => handleDeleteIdea(idea.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-200 rounded transition-all"
                              >
                                <Trash2 className="h-4 w-4 text-zinc-500" />
                              </button>
                              <ChevronRight className="h-4 w-4 text-zinc-400" />
                            </div>
                          </div>
                        </div>
                      ))}
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