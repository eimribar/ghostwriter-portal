// =====================================================
// CONTENT CALENDAR PAGE
// Schedule and track approved content
// =====================================================

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, ExternalLink, Archive, Building } from 'lucide-react';
import { cn } from '../lib/utils';
import { generatedContentService, type GeneratedContent, clientsService } from '../services/database.service';
import { useClientSwitch } from '../contexts/ClientSwitchContext';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const ContentCalendar = () => {
  const { activeClient } = useClientSwitch();
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [clients, setClients] = useState<Record<string, { name: string; company: string }>>({});
  const [view, setView] = useState<'pending' | 'scheduled' | 'posted'>('pending');

  useEffect(() => {
    loadContent();
    loadClients();
  }, [activeClient, view]);

  const loadClients = async () => {
    try {
      const clientsData = await clientsService.getAll();
      const clientsMap: Record<string, { name: string; company: string }> = {};
      clientsData.forEach(client => {
        clientsMap[client.id] = { name: client.name, company: client.company };
      });
      setClients(clientsMap);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadContent = async () => {
    setLoading(true);
    try {
      let allContent = await generatedContentService.getAll();
      
      // Only show client-approved content that's not archived
      allContent = allContent.filter(c => 
        c.status === 'client_approved' && !c.archived
      );
      
      // Filter by active client if selected
      if (activeClient) {
        allContent = allContent.filter(c => c.client_id === activeClient.id);
      }
      
      // Filter by view
      if (view === 'scheduled') {
        allContent = allContent.filter(c => c.scheduled_for && !c.posted_at);
      } else if (view === 'posted') {
        allContent = allContent.filter(c => c.posted_at);
      } else {
        allContent = allContent.filter(c => !c.scheduled_for && !c.posted_at);
      }
      
      // Sort by date
      allContent.sort((a, b) => {
        const dateField = view === 'scheduled' ? 'scheduled_for' : 
                         view === 'posted' ? 'posted_at' : 
                         'updated_at';
        const dateA = new Date(a[dateField] || a.created_at).getTime();
        const dateB = new Date(b[dateField] || b.created_at).getTime();
        return dateB - dateA;
      });
      
      setContent(allContent);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (item: GeneratedContent, scheduledDate: string) => {
    setProcessing(item.id);
    try {
      const { error } = await supabase
        .from('generated_content')
        .update({
          scheduled_for: scheduledDate,
          status: 'scheduled'
        })
        .eq('id', item.id);

      if (error) throw error;
      
      await loadContent();
      toast.success('Content scheduled successfully');
    } catch (error) {
      console.error('Error scheduling content:', error);
      toast.error('Failed to schedule content');
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkAsPosted = async (item: GeneratedContent, postUrl?: string) => {
    setProcessing(item.id);
    try {
      const { error } = await supabase
        .from('generated_content')
        .update({
          posted_at: new Date().toISOString(),
          post_url: postUrl,
          status: 'published'
        })
        .eq('id', item.id);

      if (error) throw error;
      
      await loadContent();
      toast.success('Content marked as posted');
    } catch (error) {
      console.error('Error marking as posted:', error);
      toast.error('Failed to mark as posted');
    } finally {
      setProcessing(null);
    }
  };

  const handleArchive = async (item: GeneratedContent) => {
    setProcessing(item.id);
    try {
      const { error } = await supabase
        .from('generated_content')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_reason: 'Archived from calendar'
        })
        .eq('id', item.id);

      if (error) throw error;
      
      await loadContent();
      toast.success('Content archived');
    } catch (error) {
      console.error('Error archiving content:', error);
      toast.error('Failed to archive content');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Content Calendar</h1>
            <p className="text-zinc-600 mt-2">
              Schedule and track your approved content
            </p>
          </div>
          {activeClient && (
            <div className="text-right">
              <p className="text-sm text-zinc-500">Calendar for</p>
              <p className="text-lg font-semibold text-zinc-900">{activeClient.name}</p>
              <p className="text-sm text-zinc-600">{activeClient.company}</p>
            </div>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => setView('pending')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2",
            view === 'pending' 
              ? "bg-zinc-900 text-white" 
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          <Clock className="w-4 h-4" />
          Ready to Schedule ({content.filter(c => !c.scheduled_for && !c.posted_at).length})
        </button>
        <button
          onClick={() => setView('scheduled')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2",
            view === 'scheduled' 
              ? "bg-blue-600 text-white" 
              : "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
          )}
        >
          <Calendar className="w-4 h-4" />
          Scheduled ({content.filter(c => c.scheduled_for && !c.posted_at).length})
        </button>
        <button
          onClick={() => setView('posted')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2",
            view === 'posted' 
              ? "bg-green-600 text-white" 
              : "bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
          )}
        >
          <CheckCircle className="w-4 h-4" />
          Posted ({content.filter(c => c.posted_at).length})
        </button>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
          <p className="text-zinc-600 mt-4">Loading calendar...</p>
        </div>
      ) : content.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 rounded-xl">
          <Calendar className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <p className="text-zinc-600">
            {view === 'pending' && "No content ready to schedule"}
            {view === 'scheduled' && "No scheduled content"}
            {view === 'posted' && "No posted content yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-zinc-200 p-4 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="mb-3">
                {item.client_id && clients[item.client_id] && (
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-700">
                      {clients[item.client_id].name}
                    </span>
                  </div>
                )}
                
                {/* Date info */}
                {view === 'scheduled' && item.scheduled_for && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Calendar className="w-4 h-4" />
                    Scheduled: {new Date(item.scheduled_for).toLocaleDateString()}
                  </div>
                )}
                {view === 'posted' && item.posted_at && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Posted: {new Date(item.posted_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Content Preview */}
              <div className="mb-4 p-3 bg-zinc-50 rounded-lg">
                <p className="text-sm text-zinc-700 line-clamp-3">
                  {item.content_text}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2">
                {view === 'pending' && (
                  <>
                    <input
                      type="datetime-local"
                      onChange={(e) => handleSchedule(item, e.target.value)}
                      disabled={processing === item.id}
                      className="flex-1 px-2 py-1 text-sm border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <button
                      onClick={() => handleArchive(item)}
                      disabled={processing === item.id}
                      className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </>
                )}
                
                {view === 'scheduled' && (
                  <>
                    <button
                      onClick={() => {
                        const url = prompt('Enter the post URL (optional):');
                        handleMarkAsPosted(item, url || undefined);
                      }}
                      disabled={processing === item.id}
                      className="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Mark as Posted
                    </button>
                  </>
                )}
                
                {view === 'posted' && item.post_url && (
                  <a
                    href={item.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Post
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentCalendar;