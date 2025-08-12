import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit2, Clock, Filter, ChevronRight, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { generatedContentService, scheduledPostsService, type GeneratedContent } from '../services/database.service';
import { useAuth } from '../contexts/AuthContext';

const Approval = () => {
  const { user } = useAuth();
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, [filter]);

  const loadContent = async () => {
    setLoading(true);
    try {
      let allContent = await generatedContentService.getAll();
      
      // Filter based on status
      if (filter !== 'all') {
        allContent = allContent.filter(c => c.status === filter);
      }
      
      // Sort by created_at desc
      allContent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setContent(allContent);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: GeneratedContent) => {
    setProcessing(item.id);
    try {
      // Update status to approved
      const success = await generatedContentService.approve(
        item.id,
        user?.id || 'system',
        'Approved via approval queue'
      );
      
      if (success) {
        // Auto-schedule for next available slot (e.g., tomorrow at 10 AM)
        const scheduledFor = new Date();
        scheduledFor.setDate(scheduledFor.getDate() + 1);
        scheduledFor.setHours(10, 0, 0, 0);
        
        await scheduledPostsService.schedule(
          item.id,
          item.client_id || '',
          scheduledFor,
          'linkedin'
        );
        
        // Refresh the list
        await loadContent();
      }
    } catch (error) {
      console.error('Error approving content:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (item: GeneratedContent) => {
    const reason = prompt('Rejection reason (optional):');
    setProcessing(item.id);
    
    try {
      await generatedContentService.reject(item.id, reason || 'Rejected via approval queue');
      await loadContent();
    } catch (error) {
      console.error('Error rejecting content:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleEdit = (item: GeneratedContent) => {
    setSelectedContent(item);
    setEditingContent(item.content_text);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedContent) return;
    
    setProcessing(selectedContent.id);
    try {
      await generatedContentService.update(selectedContent.id, {
        content_text: editingContent,
        status: 'revision_requested',
        revision_notes: 'Edited via approval queue'
      });
      
      setIsEditing(false);
      setSelectedContent(null);
      await loadContent();
    } catch (error) {
      console.error('Error saving edit:', error);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Pending</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Rejected</span>;
      case 'revision_requested':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Needs Revision</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Approval Queue</h1>
        <p className="text-zinc-600 mt-2">
          Review and approve generated content before scheduling
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2">
        <Filter className="w-5 h-5 text-zinc-500" />
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            filter === 'all' 
              ? "bg-zinc-900 text-white" 
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          All ({content.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            filter === 'pending' 
              ? "bg-zinc-900 text-white" 
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          Pending ({content.filter(c => c.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            filter === 'approved' 
              ? "bg-zinc-900 text-white" 
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          Approved ({content.filter(c => c.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            filter === 'rejected' 
              ? "bg-zinc-900 text-white" 
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          Rejected ({content.filter(c => c.status === 'rejected').length})
        </button>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="text-center py-12">
          <Clock className="w-8 h-8 text-zinc-400 mx-auto mb-4 animate-spin" />
          <p className="text-zinc-600">Loading content...</p>
        </div>
      ) : content.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 rounded-xl">
          <p className="text-zinc-600">No content to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {content.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-zinc-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusBadge(item.status)}
                  <span className="text-sm text-zinc-500">
                    Variant {item.variant_number} • {item.llm_provider} • 
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={processing === item.id}
                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleReject(item)}
                        disabled={processing === item.id}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        disabled={processing === item.id}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                        title="Edit"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Content Preview */}
              <div className="prose prose-zinc max-w-none">
                <p className="text-sm text-zinc-700 leading-relaxed line-clamp-4">
                  {item.content_text}
                </p>
              </div>

              {/* Hashtags */}
              {item.hashtags && item.hashtags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.hashtags.map((tag: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Expand Button */}
              <button
                onClick={() => setSelectedContent(item)}
                className="mt-4 text-sm text-zinc-600 hover:text-zinc-900 flex items-center gap-1"
              >
                View full content
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && selectedContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Edit Content</h3>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedContent(null);
                }}
                className="p-2 hover:bg-zinc-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full h-96 p-4 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedContent(null);
                }}
                className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={processing === selectedContent.id}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Content Modal */}
      {selectedContent && !isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Full Content</h3>
              <button
                onClick={() => setSelectedContent(null)}
                className="p-2 hover:bg-zinc-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="prose prose-zinc max-w-none">
              <div className="whitespace-pre-wrap text-sm text-zinc-700 leading-relaxed">
                {selectedContent.content_text}
              </div>
            </div>
            
            {selectedContent.hashtags && selectedContent.hashtags.length > 0 && (
              <div className="mt-6 pt-4 border-t border-zinc-200">
                <div className="flex flex-wrap gap-2">
                  {selectedContent.hashtags.map((tag: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Approval;