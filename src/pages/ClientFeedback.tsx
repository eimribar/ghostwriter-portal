// =====================================================
// CLIENT FEEDBACK PAGE
// Handle client responses (approved/rejected/edited)
// =====================================================

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, PenTool, Archive, Calendar, RefreshCw, MessageSquare, Building } from 'lucide-react';
import { cn } from '../lib/utils';
import { generatedContentService, type GeneratedContent, clientsService } from '../services/database.service';
import { useClientSwitch } from '../contexts/ClientSwitchContext';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const ClientFeedback = () => {
  const { activeClient } = useClientSwitch();
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [clients, setClients] = useState<Record<string, { name: string; company: string }>>({});
  const [filter, setFilter] = useState<'all' | 'client_approved' | 'client_rejected' | 'client_edited'>('all');
  const [editingContent, setEditingContent] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    loadContent();
    loadClients();
  }, [activeClient, filter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadContent, 30000);
    return () => clearInterval(interval);
  }, [activeClient, filter]);

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
      
      // Filter for client-actioned content only (excluding archived)
      allContent = allContent.filter(c => 
        (c.status === 'client_approved' || 
         c.status === 'client_rejected' || 
         c.status === 'client_edited') &&
        !c.archived
      );
      
      // Apply status filter
      if (filter !== 'all') {
        allContent = allContent.filter(c => c.status === filter);
      }
      
      // Filter by active client if selected
      if (activeClient) {
        allContent = allContent.filter(c => c.client_id === activeClient.id);
      }
      
      // Sort by updated_at desc
      allContent.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      });
      
      setContent(allContent);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (item: GeneratedContent, reason?: string) => {
    setProcessing(item.id);
    try {
      const { error } = await supabase
        .from('generated_content')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_reason: reason || 'Archived after client feedback'
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

  const handleSchedule = async (item: GeneratedContent) => {
    // This will be expanded when we build the calendar page
    toast.success('Redirecting to calendar...');
    // Navigate to calendar with this content
  };

  const handleEditAndResend = async (item: GeneratedContent) => {
    if (!editingContent || editingContent.id !== item.id) return;
    
    setProcessing(item.id);
    try {
      await generatedContentService.update(item.id, {
        content_text: editingContent.text,
        status: 'admin_approved' as const,
        revision_notes: 'Revised after client feedback and resent for approval'
      });
      
      await loadContent();
      toast.success('Content revised and sent back to client');
      setEditingContent(null);
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('Failed to update content');
    } finally {
      setProcessing(null);
    }
  };

  const getActionButtons = (item: GeneratedContent) => {
    switch (item.status) {
      case 'client_approved':
        return (
          <>
            <button
              onClick={() => handleSchedule(item)}
              disabled={processing === item.id}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
            <button
              onClick={() => handleArchive(item, 'Scheduled for publication')}
              disabled={processing === item.id}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
          </>
        );
      
      case 'client_rejected':
        return (
          <>
            {editingContent?.id === item.id ? (
              <>
                <button
                  onClick={() => handleEditAndResend(item)}
                  disabled={processing === item.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Save & Resend
                </button>
                <button
                  onClick={() => setEditingContent(null)}
                  className="px-4 py-2 text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditingContent({ id: item.id, text: item.content_text })}
                  disabled={processing === item.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <PenTool className="w-4 h-4" />
                  Edit & Resend
                </button>
                <button
                  onClick={() => handleArchive(item, item.revision_notes || 'Client rejected')}
                  disabled={processing === item.id}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
              </>
            )}
          </>
        );
      
      case 'client_edited':
        return (
          <>
            <button
              onClick={() => handleSchedule(item)}
              disabled={processing === item.id}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              Approve Changes
            </button>
            <button
              onClick={() => setEditingContent({ id: item.id, text: item.content_text })}
              disabled={processing === item.id}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <PenTool className="w-4 h-4" />
              Review & Edit
            </button>
          </>
        );
      
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'client_approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
            <ThumbsUp className="w-3 h-3" />
            Client Approved
          </span>
        );
      case 'client_rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
            <ThumbsDown className="w-3 h-3" />
            Client Rejected
          </span>
        );
      case 'client_edited':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
            <PenTool className="w-3 h-3" />
            Client Edited
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Client Feedback</h1>
            <p className="text-zinc-600 mt-2">
              Review and handle client responses to your content
            </p>
          </div>
          {activeClient && (
            <div className="text-right">
              <p className="text-sm text-zinc-500">Client feedback from</p>
              <p className="text-lg font-semibold text-zinc-900">{activeClient.name}</p>
              <p className="text-sm text-zinc-600">{activeClient.company}</p>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            filter === 'all' 
              ? "bg-zinc-900 text-white" 
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          All Feedback ({content.length})
        </button>
        <button
          onClick={() => setFilter('client_approved')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2",
            filter === 'client_approved' 
              ? "bg-green-600 text-white" 
              : "bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
          )}
        >
          <ThumbsUp className="w-4 h-4" />
          Approved ({content.filter(c => c.status === 'client_approved').length})
        </button>
        <button
          onClick={() => setFilter('client_rejected')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2",
            filter === 'client_rejected' 
              ? "bg-red-600 text-white" 
              : "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
          )}
        >
          <ThumbsDown className="w-4 h-4" />
          Rejected ({content.filter(c => c.status === 'client_rejected').length})
        </button>
        <button
          onClick={() => setFilter('client_edited')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2",
            filter === 'client_edited' 
              ? "bg-yellow-600 text-white" 
              : "bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100"
          )}
        >
          <PenTool className="w-4 h-4" />
          Edited ({content.filter(c => c.status === 'client_edited').length})
        </button>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
          <p className="text-zinc-600 mt-4">Loading feedback...</p>
        </div>
      ) : content.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 rounded-xl">
          <MessageSquare className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <p className="text-zinc-600">No client feedback yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {content.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-zinc-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(item.status)}
                    {item.client_id && clients[item.client_id] && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-700">
                          {clients[item.client_id].name}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-zinc-500">
                      {new Date(item.updated_at || item.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Client feedback/reason */}
                  {item.revision_notes && (
                    <div className={cn(
                      "mb-4 p-3 rounded-lg",
                      item.status === 'client_rejected' 
                        ? "bg-red-50 border border-red-200"
                        : "bg-yellow-50 border border-yellow-200"
                    )}>
                      <p className="text-sm font-medium text-zinc-700 mb-1">Client Feedback:</p>
                      <p className="text-sm text-zinc-600">{item.revision_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              {editingContent?.id === item.id ? (
                <textarea
                  value={editingContent.text}
                  onChange={(e) => setEditingContent({ ...editingContent, text: e.target.value })}
                  className="w-full h-32 p-3 mb-4 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                />
              ) : (
                <div className="mb-4 p-4 bg-zinc-50 rounded-lg">
                  <p className="text-zinc-700 whitespace-pre-wrap">{item.content_text}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2">
                {getActionButtons(item)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientFeedback;