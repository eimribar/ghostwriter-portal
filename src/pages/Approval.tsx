import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit2, Clock, Filter, ChevronRight, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { generatedContentService, type GeneratedContent } from '../services/database.service';
import { useAuth } from '../contexts/AuthContext';

const Approval = () => {
  const { user } = useAuth();
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'admin_approved' | 'admin_rejected'>('draft');
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
      console.log('Loaded content from database:', allContent);
      
      // Filter based on status
      if (filter !== 'all') {
        allContent = allContent.filter(c => c.status === filter);
      }
      
      // Sort by created_at desc
      allContent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setContent(allContent);
      console.log('Final content after filtering:', allContent);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: GeneratedContent) => {
    setProcessing(item.id);
    console.log('Approving item:', item.id);
    try {
      // Update status to admin_approved (goes to client for final approval)
      const success = await generatedContentService.update(item.id, {
        status: 'admin_approved' as const,
        approved_at: new Date().toISOString() as any, // Convert to ISO string for Supabase
        approved_by: undefined, // No user tracking for now
        revision_notes: 'Approved by admin for client review'
      });
      
      console.log('Update success:', success);
      
      if (success) {
        // Refresh the list
        await loadContent();
        alert('Content approved! Status changed to admin_approved');
      } else {
        alert('Failed to approve content. Check console for errors.');
      }
    } catch (error) {
      console.error('Error approving content:', error);
      alert('Error approving content: ' + error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (item: GeneratedContent) => {
    const reason = prompt('Rejection reason (optional):');
    setProcessing(item.id);
    
    try {
      await generatedContentService.update(item.id, {
        status: 'admin_rejected',
        revision_notes: reason || 'Rejected by admin'
      });
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
        status: 'draft',
        revision_notes: 'Edited via approval queue - needs re-approval'
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
      case 'draft':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Draft</span>;
      case 'admin_approved':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Admin Approved</span>;
      case 'admin_rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Admin Rejected</span>;
      case 'client_approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Client Approved</span>;
      case 'client_rejected':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Client Rejected</span>;
      case 'scheduled':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Scheduled</span>;
      case 'published':
        return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">Published</span>;
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
          onClick={() => setFilter('draft')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            filter === 'draft' 
              ? "bg-zinc-900 text-white" 
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          Drafts ({content.filter(c => c.status === 'draft').length})
        </button>
        <button
          onClick={() => setFilter('admin_approved')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            filter === 'admin_approved' 
              ? "bg-zinc-900 text-white" 
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          Approved ({content.filter(c => c.status === 'admin_approved').length})
        </button>
        <button
          onClick={() => setFilter('admin_rejected')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            filter === 'admin_rejected' 
              ? "bg-zinc-900 text-white" 
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          Rejected ({content.filter(c => c.status === 'admin_rejected').length})
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
                  {item.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={processing === item.id}
                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                        title="Approve for Client"
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