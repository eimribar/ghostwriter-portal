import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Sparkles, 
  MessageSquare, 
  Newspaper, 
  Edit3,
  Trash2,
  ChevronDown,
  Check,
  X,
  Loader2,
  AlertCircle,
  Filter,
  ExternalLink
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
  const [filteredIdeas, setFilteredIdeas] = useState<IdeaWithUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithUI | null>(null);
  const [activeJobs, setActiveJobs] = useState<SearchJob[]>([]);
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Source tabs configuration
  const sourceTabs = [
    { id: 'all', label: 'All', icon: null },
    { id: 'trending', label: 'News & Trends', icon: Newspaper },
    { id: 'ai', label: 'AI Generated', icon: Sparkles },
    { id: 'slack', label: 'Slack', icon: MessageSquare },
    { id: 'manual', label: 'Manual', icon: Edit3 }
  ];

  // Load ideas on mount
  useEffect(() => {
    loadIdeas();
    checkActiveJobs();
    const interval = setInterval(checkActiveJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter ideas when criteria change
  useEffect(() => {
    let filtered = [...ideas];

    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.filter(idea => idea.source === selectedSource);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(idea => idea.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(idea => 
        idea.title.toLowerCase().includes(query) ||
        idea.description?.toLowerCase().includes(query) ||
        idea.hashtags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredIdeas(filtered);
  }, [ideas, selectedSource, selectedStatus, searchQuery]);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const fetchedIdeas = await contentIdeasService.getAll();
      setIdeas(fetchedIdeas || []);
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

  const handleDeleteIdea = async (ideaId: string) => {
    try {
      const { error } = await supabase
        .from('content_ideas')
        .delete()
        .eq('id', ideaId);

      if (error) throw error;

      setIdeas(prev => prev.filter(idea => idea.id !== ideaId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting idea:', err);
      setError('Failed to delete idea');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('content_ideas')
        .delete()
        .in('id', Array.from(selectedIdeas));

      if (error) throw error;

      setIdeas(prev => prev.filter(idea => !selectedIdeas.has(idea.id)));
      setSelectedIdeas(new Set());
      setBulkSelectMode(false);
    } catch (err) {
      console.error('Error deleting ideas:', err);
      setError('Failed to delete ideas');
    }
  };

  const toggleIdeaSelection = (ideaId: string) => {
    const newSelection = new Set(selectedIdeas);
    if (newSelection.has(ideaId)) {
      newSelection.delete(ideaId);
    } else {
      newSelection.add(ideaId);
    }
    setSelectedIdeas(newSelection);
  };

  const selectAll = () => {
    const allIds = new Set(filteredIdeas.map(idea => idea.id));
    setSelectedIdeas(allIds);
  };

  const getSourceCount = (source: string) => {
    if (source === 'all') return ideas.length;
    return ideas.filter(idea => idea.source === source).length;
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

  return (
    <div className="flex-1 bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Content Ideation</h1>
              <p className="text-sm text-zinc-500 mt-1">Discover, create, and manage content ideas</p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Active jobs indicator */}
              {activeJobs.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700">{activeJobs.length} active searches</span>
                </div>
              )}
              
              {/* Action buttons */}
              <button
                onClick={() => setShowNewsModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <Newspaper className="h-4 w-4" />
                News & Trends
              </button>
              
              <button
                onClick={() => setShowAIModal(true)}
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

          {/* Source Tabs */}
          <div className="flex items-center gap-1 border-b border-zinc-200 -mb-6">
            {sourceTabs.map(tab => {
              const Icon = tab.icon;
              const count = getSourceCount(tab.id);
              const isActive = selectedSource === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSource(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                    isActive 
                      ? "border-zinc-900 text-zinc-900" 
                      : "border-transparent text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className="font-medium">{tab.label}</span>
                  <span className={cn(
                    "text-sm px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-zinc-100" : "bg-zinc-50"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-b border-zinc-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-sm"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                showFilters && "rotate-180"
              )} />
            </button>

            {/* Status Filter (visible when filters expanded) */}
            {showFilters && (
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="in-progress">In Progress</option>
                <option value="used">Used</option>
              </select>
            )}
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            {bulkSelectMode ? (
              <>
                <button
                  onClick={selectAll}
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
                  Select All ({filteredIdeas.length})
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIdeas.size === 0}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedIdeas.size > 0
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedIdeas.size})
                </button>
                <button
                  onClick={() => {
                    setBulkSelectMode(false);
                    setSelectedIdeas(new Set());
                  }}
                  className="px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setBulkSelectMode(true)}
                className="px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-sm"
              >
                Select
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-100 rounded-full mb-4">
              <Search className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">No ideas found</h3>
            <p className="text-zinc-500 mb-6">
              {searchQuery || selectedSource !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Start by generating AI ideas or creating your own'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredIdeas.map(idea => (
              <div
                key={idea.id}
                className="group relative bg-white rounded-lg border border-zinc-200 p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => !bulkSelectMode && setSelectedIdea(idea)}
              >
                {/* Checkbox for bulk selection */}
                {bulkSelectMode && (
                  <div 
                    className="absolute top-3 left-3 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleIdeaSelection(idea.id);
                    }}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      selectedIdeas.has(idea.id)
                        ? "bg-zinc-900 border-zinc-900"
                        : "bg-white border-zinc-300 hover:border-zinc-500"
                    )}>
                      {selectedIdeas.has(idea.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>
                )}

                {/* Delete button (visible on hover) */}
                {!bulkSelectMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(idea.id);
                    }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-zinc-100 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4 text-zinc-500 hover:text-red-600" />
                  </button>
                )}

                {/* Content */}
                <div className={cn(bulkSelectMode && "ml-8")}>
                  <h3 className="font-semibold text-zinc-900 mb-1 line-clamp-2">
                    {idea.title}
                  </h3>
                  <p className="text-sm text-zinc-600 mb-3 line-clamp-2">
                    {idea.description}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                      {/* Status dot */}
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        idea.status === 'ready' && "bg-green-500",
                        idea.status === 'draft' && "bg-zinc-400",
                        idea.status === 'in-progress' && "bg-blue-500",
                        idea.status === 'used' && "bg-purple-500"
                      )} />
                      
                      {/* Author/Source */}
                      <span>
                        {idea.source === 'slack' && idea.slack_user_name
                          ? idea.slack_user_name
                          : idea.source === 'trending'
                          ? 'News'
                          : idea.source === 'ai'
                          ? 'AI'
                          : 'Manual'}
                      </span>
                      
                      {/* Time */}
                      <span>• {formatDate(idea.created_at)}</span>
                    </div>

                    {/* Priority indicator (only for high) */}
                    {idea.priority === 'high' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                  </div>

                  {/* Tags (if any) */}
                  {idea.hashtags && idea.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {idea.hashtags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs text-zinc-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === idea.id && (
                  <div 
                    className="absolute inset-0 bg-white rounded-lg border border-red-200 p-4 flex flex-col justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-sm text-zinc-700 mb-3">Delete this idea?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteIdea(idea.id)}
                        className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
                  <span className="flex items-center gap-1">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      selectedIdea.status === 'ready' && "bg-green-500",
                      selectedIdea.status === 'draft' && "bg-zinc-400"
                    )} />
                    {selectedIdea.status}
                  </span>
                  <span>•</span>
                  <span>
                    {selectedIdea.source === 'slack' && selectedIdea.slack_user_name
                      ? `${selectedIdea.slack_user_name} via Slack`
                      : selectedIdea.source}
                  </span>
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

            {/* Additional Info */}
            {selectedIdea.notes && (
              <div className="p-3 bg-zinc-50 rounded-lg mb-4">
                <p className="text-sm text-zinc-600">{selectedIdea.notes}</p>
              </div>
            )}

            {/* Slack Link */}
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

            {/* Tags */}
            {selectedIdea.hashtags && selectedIdea.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedIdea.hashtags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-zinc-100 rounded text-sm text-zinc-600">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // TODO: Navigate to generate page with this idea
                  window.location.href = `/generate?idea=${selectedIdea.id}`;
                }}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Generate Content
              </button>
              <button
                onClick={() => {
                  handleDeleteIdea(selectedIdea.id);
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

      {/* New Idea Modal */}
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

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Priority</label>
                <select className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900">
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
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
                onClick={() => {
                  // TODO: Implement save
                  setShowNewIdeaModal(false);
                }}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Generate AI Ideas</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Topic</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="e.g., B2B SaaS growth strategies"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Number of Ideas</label>
                <select className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900">
                  <option value="5">5 ideas</option>
                  <option value="10">10 ideas</option>
                  <option value="15">15 ideas</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAIModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement generation
                  setShowAIModal(false);
                }}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* News Search Modal */}
      {showNewsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Search News & Trends</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Search Query</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="e.g., AI in marketing"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  This will search real-time web news and may take 2-5 minutes. You'll receive an email when complete.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowNewsModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement search
                  setShowNewsModal(false);
                }}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Start Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ideation;