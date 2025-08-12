import { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, Users, FileText, Star, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import type { Creator, ContentPost } from '../lib/supabase';

interface CreatorWithPosts extends Creator {
  posts?: ContentPost[];
}

const ContentLake = () => {
  const [creators, setCreators] = useState<CreatorWithPosts[]>([]);
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [minReactions] = useState(100);
  const [selectedCreator, setSelectedCreator] = useState<CreatorWithPosts | null>(null);

  // Mock data for development
  const mockCreators: CreatorWithPosts[] = [
    {
      id: '1',
      name: 'Justin Welsh',
      linkedin_url: 'https://linkedin.com/in/justinwelsh',
      profile_image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      follower_count: 475000,
      bio: 'Building a portfolio of one-person businesses',
      average_reactions: 850,
      content_themes: ['solopreneurship', 'content-creation', 'productivity'],
      created_at: new Date(),
      updated_at: new Date(),
      posts: [
        {
          id: 'p1',
          creator_id: '1',
          original_url: 'https://linkedin.com/posts/1',
          content_text: "The biggest mistake creators make?\n\nThinking they need to be everywhere.\n\nPick one platform. Master it. Then expand.\n\nDepth beats width every time.",
          post_type: 'text',
          reactions_count: 1243,
          comments_count: 89,
          shares_count: 45,
          hashtags: ['contentcreation', 'focus'],
          posted_at: new Date('2024-03-15'),
          scraped_at: new Date(),
          quality_score: 0.92,
          is_promotional: false,
          content_themes: ['content-creation', 'strategy']
        },
        {
          id: 'p2',
          creator_id: '1',
          original_url: 'https://linkedin.com/posts/2',
          content_text: "I made $0 my first 6 months creating content.\n\nThen I changed one thing:\n\nI stopped creating content I thought people wanted.\nI started creating content that solved my own problems from 2 years ago.\n\nRevenue went from $0 to $40k/month in 8 months.",
          post_type: 'text',
          reactions_count: 2156,
          comments_count: 234,
          shares_count: 112,
          hashtags: ['contentmarketing', 'entrepreneurship'],
          posted_at: new Date('2024-03-14'),
          scraped_at: new Date(),
          quality_score: 0.95,
          is_promotional: false,
          content_themes: ['business-growth', 'content-strategy']
        }
      ]
    },
    {
      id: '2',
      name: 'Sahil Bloom',
      linkedin_url: 'https://linkedin.com/in/sahilbloom',
      profile_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      follower_count: 890000,
      bio: 'Exploring curiosity and sharing ideas on growth',
      average_reactions: 1200,
      content_themes: ['personal-growth', 'mental-models', 'career'],
      created_at: new Date(),
      updated_at: new Date(),
      posts: [
        {
          id: 'p3',
          creator_id: '2',
          original_url: 'https://linkedin.com/posts/3',
          content_text: "5 mental models that changed my life:\n\n1. Inversion - Start with the end goal\n2. Circle of Competence - Know your strengths\n3. First Principles - Break down complex problems\n4. Second-Order Thinking - Consider consequences\n5. Margin of Safety - Build in buffers\n\nWhich one resonates most with you?",
          post_type: 'text',
          reactions_count: 2156,
          comments_count: 234,
          shares_count: 112,
          hashtags: ['mentalmodels', 'growth', 'productivity'],
          posted_at: new Date('2024-03-14'),
          scraped_at: new Date(),
          quality_score: 0.95,
          is_promotional: false,
          content_themes: ['mental-models', 'personal-growth']
        }
      ]
    },
    {
      id: '3',
      name: 'Jasmin Alić',
      linkedin_url: 'https://linkedin.com/in/jasminalic',
      profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      follower_count: 125000,
      bio: 'Helping brands tell better stories',
      average_reactions: 650,
      content_themes: ['storytelling', 'branding', 'marketing'],
      created_at: new Date(),
      updated_at: new Date(),
      posts: []
    }
  ];

  useEffect(() => {
    loadCreators();
  }, []);

  const loadCreators = async () => {
    try {
      setLoading(true);
      // Use mock data for now
      setCreators(mockCreators);
    } finally {
      setLoading(false);
    }
  };

  const filteredCreators = creators.filter(creator => {
    const matchesSearch = !searchQuery || 
      creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTheme = selectedTheme === 'all' || 
      creator.content_themes?.includes(selectedTheme);
    
    return matchesSearch && matchesTheme;
  });

  const uniqueThemes = Array.from(new Set(creators.flatMap(c => c.content_themes || [])));

  return (
    <div className="flex-1 bg-zinc-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Content Lake</h1>
            <p className="text-zinc-600 mt-1">Curated high-performing content from LinkedIn creators</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
              <RefreshCw className="h-4 w-4" />
              Sync Creators
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
              <Plus className="h-4 w-4" />
              Add Creator
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search creators, topics, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            
            <select 
              value={selectedTheme} 
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="all">All Themes</option>
              {uniqueThemes.map(theme => (
                <option key={theme} value={theme}>
                  {theme.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
              <Filter className="h-4 w-4" />
              More Filters
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-zinc-100">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600">{creators.length} Creators</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600">
                {creators.reduce((acc, c) => acc + (c.posts?.length || 0), 0)} Posts
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600">Min {minReactions} reactions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Creator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCreators.map(creator => (
          <div 
            key={creator.id} 
            className="bg-white rounded-lg border border-zinc-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedCreator(creator)}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <img 
                  src={creator.profile_image} 
                  alt={creator.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900">{creator.name}</h3>
                      <p className="text-sm text-zinc-600">
                        {creator.follower_count?.toLocaleString()} followers
                      </p>
                    </div>
                    <button 
                      className="p-1 hover:bg-zinc-100 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(creator.linkedin_url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4 text-zinc-400" />
                    </button>
                  </div>
                  <p className="text-sm text-zinc-600 mt-2 line-clamp-2">{creator.bio}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded text-xs text-zinc-700">
                      <TrendingUp className="h-3 w-3" />
                      {creator.average_reactions} avg
                    </span>
                    {creator.content_themes?.slice(0, 2).map(theme => (
                      <span key={theme} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {theme.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Posts Preview */}
              {creator.posts && creator.posts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                    Top Posts
                  </div>
                  {creator.posts.slice(0, 2).map(post => (
                    <div key={post.id} className="mb-3 p-3 bg-zinc-50 rounded-lg">
                      <p className="text-sm text-zinc-700 line-clamp-2 mb-2">
                        {post.content_text}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {post.reactions_count}
                        </span>
                        <span>{post.comments_count} comments</span>
                        <span>{post.shares_count} shares</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Creator Detail Modal */}
      {selectedCreator && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCreator(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <img 
                    src={selectedCreator.profile_image} 
                    alt={selectedCreator.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">{selectedCreator.name}</h2>
                    <p className="text-zinc-600">{selectedCreator.bio}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-zinc-500">
                        {selectedCreator.follower_count?.toLocaleString()} followers
                      </span>
                      <span className="text-sm text-zinc-500">
                        {selectedCreator.average_reactions} avg reactions
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCreator(null)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="font-semibold text-zinc-900 mb-4">Recent Posts</h3>
              <div className="space-y-4">
                {selectedCreator.posts?.map(post => (
                  <div key={post.id} className="p-4 border border-zinc-200 rounded-lg">
                    <p className="text-zinc-700 whitespace-pre-wrap mb-3">{post.content_text}</p>
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {post.reactions_count} reactions
                      </span>
                      <span>{post.comments_count} comments</span>
                      <span>{post.shares_count} shares</span>
                      <span className="ml-auto">
                        {new Date(post.posted_at).toLocaleDateString()}
                      </span>
                    </div>
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {post.hashtags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-1 bg-zinc-100 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentLake;