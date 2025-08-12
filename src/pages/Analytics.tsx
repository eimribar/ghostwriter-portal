import { useState } from 'react';
import { BarChart3, TrendingUp, Users, FileText, ArrowUp, ArrowDown, Minus, Download } from 'lucide-react';
import { cn } from '../lib/utils';

interface PerformanceData {
  date: string;
  posts: number;
  engagement: number;
  reach: number;
}

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedClient, setSelectedClient] = useState('all');

  // Mock data
  const stats = {
    totalPosts: 145,
    totalReach: 248500,
    avgEngagement: 8.2,
    topPerformingPost: {
      title: 'The hidden cost of perfectionism in startups',
      engagement: 15.3,
      reach: 12400
    }
  };

  const performanceData: PerformanceData[] = [
    { date: 'Week 1', posts: 12, engagement: 7.2, reach: 45000 },
    { date: 'Week 2', posts: 15, engagement: 8.5, reach: 52000 },
    { date: 'Week 3', posts: 18, engagement: 9.1, reach: 61000 },
    { date: 'Week 4', posts: 14, engagement: 7.8, reach: 48000 },
  ];

  const clientPerformance = [
    { name: 'Amnon Cohen', posts: 45, engagement: 9.2, trend: 'up' },
    { name: 'Sarah Chen', posts: 38, engagement: 7.8, trend: 'up' },
    { name: 'Marcus Johnson', posts: 32, engagement: 6.5, trend: 'stable' },
    { name: 'Lisa Wang', posts: 30, engagement: 8.9, trend: 'down' },
  ];

  const topPosts = [
    { 
      title: 'The hidden cost of perfectionism',
      client: 'Amnon Cohen',
      date: '3 days ago',
      likes: 1243,
      comments: 89,
      shares: 45,
      engagement: 15.3
    },
    {
      title: '5 mental models for product managers',
      client: 'Sarah Chen',
      date: '5 days ago',
      likes: 856,
      comments: 67,
      shares: 34,
      engagement: 12.1
    },
    {
      title: 'Building in public: Month 1',
      client: 'Amnon Cohen',
      date: '1 week ago',
      likes: 734,
      comments: 52,
      shares: 28,
      engagement: 10.8
    }
  ];

  const contentTypes = [
    { type: 'Insights', count: 45, percentage: 31 },
    { type: 'How-to', count: 38, percentage: 26 },
    { type: 'Case Studies', count: 32, percentage: 22 },
    { type: 'Trends', count: 30, percentage: 21 },
  ];

  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getChangePercentage = () => {
    return Math.floor(Math.random() * 30) - 15; // Random change for demo
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="flex-1 bg-zinc-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Analytics</h1>
            <p className="text-zinc-600 mt-1">Track performance and optimize your content strategy</p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
            >
              <option value="all">All Clients</option>
              <option value="amnon">Amnon Cohen</option>
              <option value="sarah">Sarah Chen</option>
              <option value="marcus">Marcus Johnson</option>
            </select>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="h-8 w-8 text-zinc-300" />
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                getChangePercentage() > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              )}>
                {getChangePercentage() > 0 ? '+' : ''}{getChangePercentage()}%
              </span>
            </div>
            <p className="text-sm text-zinc-600">Total Posts</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.totalPosts}</p>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-zinc-300" />
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-600">
                +12%
              </span>
            </div>
            <p className="text-sm text-zinc-600">Total Reach</p>
            <p className="text-2xl font-bold text-zinc-900">{formatNumber(stats.totalReach)}</p>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-zinc-300" />
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-600">
                +5.2%
              </span>
            </div>
            <p className="text-sm text-zinc-600">Avg Engagement</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.avgEngagement}%</p>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="h-8 w-8 text-zinc-300" />
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-600">
                0%
              </span>
            </div>
            <p className="text-sm text-zinc-600">Growth Rate</p>
            <p className="text-2xl font-bold text-zinc-900">18.5%</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Chart */}
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h3 className="font-semibold text-zinc-900 mb-4">Performance Overview</h3>
          <div className="space-y-4">
            {performanceData.map((week, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-zinc-600">{week.date}</span>
                  <span className="text-zinc-900 font-medium">{week.posts} posts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                      style={{ width: `${(week.engagement / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-600 w-12 text-right">{week.engagement}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Types */}
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h3 className="font-semibold text-zinc-900 mb-4">Content Mix</h3>
          <div className="space-y-3">
            {contentTypes.map((type, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-700">{type.type}</span>
                  <span className="text-sm font-medium text-zinc-900">{type.count} posts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-zinc-900 rounded-full"
                      style={{ width: `${type.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-600 w-10 text-right">{type.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Performance */}
        <div className="bg-white rounded-lg border border-zinc-200">
          <div className="p-4 border-b border-zinc-200">
            <h3 className="font-semibold text-zinc-900">Client Performance</h3>
          </div>
          <div className="divide-y divide-zinc-200">
            {clientPerformance.map((client, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900">{client.name}</p>
                  <p className="text-sm text-zinc-600">{client.posts} posts</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium text-zinc-900">{client.engagement}%</p>
                    <p className="text-xs text-zinc-500">engagement</p>
                  </div>
                  {getTrendIcon(client.trend)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Posts */}
        <div className="bg-white rounded-lg border border-zinc-200">
          <div className="p-4 border-b border-zinc-200">
            <h3 className="font-semibold text-zinc-900">Top Performing Posts</h3>
          </div>
          <div className="divide-y divide-zinc-200">
            {topPosts.map((post, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-zinc-900 line-clamp-1">{post.title}</p>
                    <p className="text-xs text-zinc-500">{post.client} • {post.date}</p>
                  </div>
                  <span className="text-sm font-bold text-green-600">{post.engagement}%</span>
                </div>
                <div className="flex gap-4 text-xs text-zinc-600">
                  <span>{post.likes} likes</span>
                  <span>{post.comments} comments</span>
                  <span>{post.shares} shares</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;