import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Edit2, Trash2, Users, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { cn } from '../lib/utils';

interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  client: string;
  date: Date;
  time: string;
  status: 'scheduled' | 'published' | 'draft' | 'failed';
  platform: 'linkedin' | 'twitter' | 'both';
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
}

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [, setShowNewPostModal] = useState(false);

  const [posts] = useState<ScheduledPost[]>([
    {
      id: '1',
      title: 'The hidden cost of perfectionism',
      content: 'Perfectionism killed more startups than competition ever did...',
      client: 'Amnon Cohen',
      date: new Date(2024, 2, 18),
      time: '09:00',
      status: 'scheduled',
      platform: 'linkedin'
    },
    {
      id: '2',
      title: '5 mental models for product managers',
      content: 'Mental models that changed how I think about product development...',
      client: 'Sarah Chen',
      date: new Date(2024, 2, 19),
      time: '14:00',
      status: 'scheduled',
      platform: 'linkedin'
    },
    {
      id: '3',
      title: 'Building in public: Week 1',
      content: 'First week of building in public. Here\'s what I learned...',
      client: 'Amnon Cohen',
      date: new Date(2024, 2, 20),
      time: '10:00',
      status: 'draft',
      platform: 'both'
    },
    {
      id: '4',
      title: 'Data-driven decision making',
      content: 'How we increased conversion by 40% using data insights...',
      client: 'Marcus Johnson',
      date: new Date(2024, 2, 15),
      time: '11:00',
      status: 'published',
      platform: 'linkedin',
      engagement: {
        likes: 234,
        comments: 18,
        shares: 12
      }
    }
  ]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getPostsForDate = (date: Date | null) => {
    if (!date) return [];
    return posts.filter(post => 
      post.date.getDate() === date.getDate() &&
      post.date.getMonth() === date.getMonth() &&
      post.date.getFullYear() === date.getFullYear()
    );
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1));
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'scheduled': return 'bg-blue-500';
      case 'published': return 'bg-green-500';
      case 'draft': return 'bg-gray-400';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'scheduled': return <Clock className="h-3 w-3" />;
      case 'published': return <CheckCircle className="h-3 w-3" />;
      case 'draft': return <Edit2 className="h-3 w-3" />;
      case 'failed': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();

  // Stats calculation
  const stats = {
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    drafts: posts.filter(p => p.status === 'draft').length,
    thisWeek: posts.filter(p => {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return p.date >= weekStart && p.date <= weekEnd;
    }).length
  };

  return (
    <div className="flex-1 bg-zinc-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Content Calendar</h1>
            <p className="text-zinc-600 mt-1">Schedule and manage your content publishing</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowNewPostModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Schedule Post
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Published</p>
                <p className="text-2xl font-bold text-green-600">{stats.published}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Drafts</p>
                <p className="text-2xl font-bold text-gray-600">{stats.drafts}</p>
              </div>
              <Edit2 className="h-8 w-8 text-gray-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">This Week</p>
                <p className="text-2xl font-bold text-purple-600">{stats.thisWeek}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-300" />
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="bg-white rounded-lg border border-zinc-200 p-2 inline-flex gap-1">
          {(['month', 'week', 'list'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                viewMode === mode
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-zinc-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-lg overflow-hidden mb-px">
            {dayNames.map(day => (
              <div key={day} className="bg-zinc-50 p-3 text-center text-sm font-medium text-zinc-600">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-lg overflow-hidden">
            {days.map((day, index) => {
              const isToday = day && 
                day.getDate() === today.getDate() && 
                day.getMonth() === today.getMonth() && 
                day.getFullYear() === today.getFullYear();
              
              const postsForDay = getPostsForDate(day);
              const isSelected = selectedDate && day && 
                day.getDate() === selectedDate.getDate() && 
                day.getMonth() === selectedDate.getMonth() && 
                day.getFullYear() === selectedDate.getFullYear();

              return (
                <div
                  key={index}
                  onClick={() => day && setSelectedDate(day)}
                  className={cn(
                    "bg-white min-h-[100px] p-2 cursor-pointer hover:bg-zinc-50 transition-colors",
                    isToday && "bg-blue-50",
                    isSelected && "ring-2 ring-zinc-900"
                  )}
                >
                  {day && (
                    <>
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        isToday ? "text-blue-600" : "text-zinc-900"
                      )}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {postsForDay.slice(0, 3).map(post => (
                          <div
                            key={post.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPost(post);
                            }}
                            className={cn(
                              "text-xs p-1 rounded flex items-center gap-1 hover:opacity-80 transition-opacity",
                              getStatusColor(post.status),
                              "text-white"
                            )}
                          >
                            {getStatusIcon(post.status)}
                            <span className="truncate">{post.time} - {post.client.split(' ')[0]}</span>
                          </div>
                        ))}
                        {postsForDay.length > 3 && (
                          <div className="text-xs text-zinc-500 text-center">
                            +{postsForDay.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg border border-zinc-200">
          <div className="p-4 border-b border-zinc-200">
            <h2 className="font-semibold text-zinc-900">All Scheduled Content</h2>
          </div>
          <div className="divide-y divide-zinc-200">
            {posts.sort((a, b) => a.date.getTime() - b.date.getTime()).map(post => (
              <div key={post.id} className="p-4 hover:bg-zinc-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1",
                        getStatusColor(post.status)
                      )}>
                        {getStatusIcon(post.status)}
                        {post.status}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {post.date.toLocaleDateString()} at {post.time}
                      </span>
                      <span className="text-sm text-zinc-700 font-medium flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {post.client}
                      </span>
                    </div>
                    <h3 className="font-medium text-zinc-900 mb-1">{post.title}</h3>
                    <p className="text-sm text-zinc-600 line-clamp-2">{post.content}</p>
                    {post.engagement && (
                      <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                        <span>{post.engagement.likes} likes</span>
                        <span>{post.engagement.comments} comments</span>
                        <span>{post.engagement.shares} shares</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedPost(post)}
                      className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Date Posts */}
      {selectedDate && viewMode === 'month' && (
        <div className="mt-6 bg-white rounded-lg border border-zinc-200 p-6">
          <h3 className="font-semibold text-zinc-900 mb-4">
            Posts for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          {getPostsForDate(selectedDate).length > 0 ? (
            <div className="space-y-3">
              {getPostsForDate(selectedDate).map(post => (
                <div key={post.id} className="flex items-start justify-between p-4 bg-zinc-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1",
                        getStatusColor(post.status)
                      )}>
                        {getStatusIcon(post.status)}
                        {post.status}
                      </span>
                      <span className="text-sm text-zinc-500">{post.time}</span>
                      <span className="text-sm text-zinc-700 font-medium">{post.client}</span>
                    </div>
                    <h4 className="font-medium text-zinc-900">{post.title}</h4>
                    <p className="text-sm text-zinc-600 mt-1 line-clamp-2">{post.content}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-zinc-200 rounded-lg transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-zinc-200 rounded-lg transition-colors">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-8">No posts scheduled for this date</p>
          )}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{selectedPost.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1",
                    getStatusColor(selectedPost.status)
                  )}>
                    {getStatusIcon(selectedPost.status)}
                    {selectedPost.status}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {selectedPost.date.toLocaleDateString()} at {selectedPost.time}
                  </span>
                  <span className="text-sm text-zinc-700 font-medium">
                    {selectedPost.client}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-zinc-50 rounded-lg p-4 mb-4">
              <p className="text-zinc-700 whitespace-pre-wrap">{selectedPost.content}</p>
            </div>

            {selectedPost.engagement && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-zinc-900">{selectedPost.engagement.likes}</p>
                  <p className="text-xs text-zinc-500">Likes</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-zinc-900">{selectedPost.engagement.comments}</p>
                  <p className="text-xs text-zinc-500">Comments</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-zinc-900">{selectedPost.engagement.shares}</p>
                  <p className="text-xs text-zinc-500">Shares</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                Edit Post
              </button>
              <button className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                Reschedule
              </button>
              {selectedPost.status === 'scheduled' && (
                <button className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
                  Publish Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;