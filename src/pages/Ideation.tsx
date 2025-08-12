import { useState } from 'react';
import { Lightbulb, TrendingUp, Brain, Zap, Plus, Star, Clock, Filter, Search, ChevronRight, Sparkles, Users, BarChart } from 'lucide-react';
import { cn } from '../lib/utils';

interface ContentIdea {
  id: string;
  title: string;
  description: string;
  source: 'trending' | 'ai' | 'manual' | 'content-lake';
  category: string;
  client?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'ready' | 'in-progress' | 'used';
  score?: number;
  tags: string[];
  createdAt: Date;
  linkedPost?: {
    creator: string;
    snippet: string;
    reactions: number;
  };
}

const Ideation = () => {
  const [ideas, setIdeas] = useState<ContentIdea[]>([
    {
      id: '1',
      title: 'The hidden cost of perfectionism in startup culture',
      description: 'Explore how perfectionism can slow down innovation and what founders can do to balance quality with speed',
      source: 'trending',
      category: 'Startup Culture',
      client: 'Amnon Cohen',
      priority: 'high',
      status: 'ready',
      score: 92,
      tags: ['startups', 'productivity', 'leadership'],
      createdAt: new Date('2024-03-15'),
      linkedPost: {
        creator: 'Justin Welsh',
        snippet: 'Perfectionism killed more startups than competition ever did...',
        reactions: 1243
      }
    },
    {
      id: '2',
      title: '5 mental models every product manager should know',
      description: 'Break down complex product decisions using proven mental frameworks',
      source: 'ai',
      category: 'Product Management',
      priority: 'medium',
      status: 'draft',
      score: 85,
      tags: ['product', 'frameworks', 'decision-making'],
      createdAt: new Date('2024-03-14')
    },
    {
      id: '3',
      title: 'Building in public: Month 1 learnings',
      description: 'Share authentic journey of building a product with full transparency',
      source: 'manual',
      category: 'Build in Public',
      client: 'Sarah Chen',
      priority: 'high',
      status: 'in-progress',
      score: 78,
      tags: ['buildinpublic', 'transparency', 'growth'],
      createdAt: new Date('2024-03-13')
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);

  // New idea form state
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    client: '',
    priority: 'medium' as 'high' | 'medium' | 'low'
  });

  const categories = ['Startup Culture', 'Product Management', 'Build in Public', 'AI & Tech', 'Leadership', 'Growth'];
  const clients = ['Amnon Cohen', 'Sarah Chen', 'Marcus Johnson'];

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = !searchQuery || 
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || idea.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || idea.status === selectedStatus;
    const matchesClient = selectedClient === 'all' || idea.client === selectedClient;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesClient;
  });

  const handleCreateIdea = () => {
    if (!newIdea.title || !newIdea.description) return;

    const idea: ContentIdea = {
      id: String(ideas.length + 1),
      title: newIdea.title,
      description: newIdea.description,
      source: 'manual',
      category: newIdea.category || 'General',
      client: newIdea.client,
      priority: newIdea.priority,
      status: 'draft',
      score: Math.floor(Math.random() * 30) + 70,
      tags: newIdea.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date()
    };

    setIdeas([idea, ...ideas]);
    setShowNewIdeaModal(false);
    setNewIdea({
      title: '',
      description: '',
      category: '',
      tags: '',
      client: '',
      priority: 'medium'
    });
  };

  const handleGenerateAIIdeas = () => {
    // Simulate AI generation
    const aiIdeas: ContentIdea[] = [
      {
        id: String(ideas.length + 1),
        title: 'Why async communication is the future of remote work',
        description: 'Deep dive into how async-first companies are outperforming their sync counterparts',
        source: 'ai',
        category: 'Remote Work',
        priority: 'high',
        status: 'ready',
        score: 88,
        tags: ['remote', 'productivity', 'communication'],
        createdAt: new Date()
      },
      {
        id: String(ideas.length + 2),
        title: 'The art of saying no: A founder\'s guide',
        description: 'Strategic framework for prioritization and focus in early-stage startups',
        source: 'ai',
        category: 'Leadership',
        priority: 'medium',
        status: 'ready',
        score: 91,
        tags: ['leadership', 'focus', 'strategy'],
        createdAt: new Date()
      }
    ];
    setIdeas([...aiIdeas, ...ideas]);
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
              onClick={handleGenerateAIIdeas}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <Brain className="h-4 w-4" />
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
                {idea.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 bg-zinc-100 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
              {idea.client && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {idea.client}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(idea.createdAt).toLocaleDateString()}
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
              {selectedIdea.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-zinc-100 rounded text-sm">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span>Category: {selectedIdea.category}</span>
                {selectedIdea.client && <span>Client: {selectedIdea.client}</span>}
                <span>Created: {new Date(selectedIdea.createdAt).toLocaleDateString()}</span>
              </div>
              <button className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
                Generate Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ideation;