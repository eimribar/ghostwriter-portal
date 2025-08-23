import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit2, Clock, Filter, Save, X, UserPlus, Building, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { generatedContentService, type GeneratedContent, clientsService } from '../services/database.service';
import ClientAssignmentModal from '../components/ClientAssignmentModal';
import toast from 'react-hot-toast';
import { useClientSwitch } from '../contexts/ClientSwitchContext';
// import { useAuth } from '../contexts/AuthContext'; // Not using auth for now

const Approval = () => {
  const { activeClient } = useClientSwitch();
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean; contentId: string | null }>({ isOpen: false, contentId: null });
  const [clients, setClients] = useState<Record<string, { name: string; company: string }>>({});

  useEffect(() => {
    loadContent();
    loadClients();
  }, [activeClient]);

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
      
      // Only show drafts and admin_rejected content for review
      allContent = allContent.filter(c => 
        c.status === 'draft' || c.status === 'admin_rejected'
      );
      
      // Filter by active client if one is selected
      if (activeClient) {
        allContent = allContent.filter(c => c.client_id === activeClient.id);
      }
      
      // Sort by created_at desc
      allContent.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setContent(allContent);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: GeneratedContent) => {
    // Check if content is assigned to a client
    if (!item.client_id) {
      const confirmUnassigned = window.confirm(
        'This content is not assigned to any client. Do you want to assign it before approving?'
      );
      if (confirmUnassigned) {
        setAssignmentModal({ isOpen: true, contentId: item.id });
        return;
      }
    }
    
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
      console.log('✅ Content status changed to admin_approved');
      
      if (success) {
        // Refresh the list
        await loadContent();
        const clientName = item.client_id ? clients[item.client_id]?.name : 'unassigned';
        toast.success(`Content approved and sent to ${clientName} for review`);
      } else {
        toast.error('Failed to approve content');
      }
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('Error approving content');
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

  const handleAssignClient = (contentId: string) => {
    setAssignmentModal({ isOpen: true, contentId });
  };

  const handleClientAssignment = async (clientId: string, clientName: string) => {
    if (!assignmentModal.contentId) return;
    
    setProcessing(assignmentModal.contentId);
    try {
      const success = await generatedContentService.update(assignmentModal.contentId, {
        client_id: clientId,
        revision_notes: `Assigned to ${clientName}`
      });
      
      if (success) {
        await loadContent();
        toast.success(`Content assigned to ${clientName}`);
      } else {
        toast.error('Failed to assign content');
      }
    } catch (error) {
      console.error('Error assigning content:', error);
      toast.error('Error assigning content');
    } finally {
      setProcessing(null);
      setAssignmentModal({ isOpen: false, contentId: null });
    }
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
      case 'admin_rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Needs Revision</span>;
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
            <h1 className="text-3xl font-bold text-zinc-900">Admin Approval</h1>
            <p className="text-zinc-600 mt-2">
              Review and approve new content before sending to clients
            </p>
          </div>
          {activeClient && (
            <div className="text-right">
              <p className="text-sm text-zinc-500">Viewing content for</p>
              <p className="text-lg font-semibold text-zinc-900">{activeClient.name}</p>
              <p className="text-sm text-zinc-600">{activeClient.company}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Pending Review</p>
              <p className="text-2xl font-bold text-zinc-900">{content.filter(c => c.status === 'draft').length}</p>
            </div>
            <Clock className="w-8 h-8 text-zinc-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Needs Revision</p>
              <p className="text-2xl font-bold text-orange-600">{content.filter(c => c.status === 'admin_rejected').length}</p>
            </div>
            <Edit2 className="w-8 h-8 text-orange-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Unassigned</p>
              <p className="text-2xl font-bold text-yellow-600">{content.filter(c => !c.client_id).length}</p>
            </div>
            <UserPlus className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
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
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(item.status)}
                    <span className="text-sm text-zinc-500">
                      Variant {item.variant_number} • {item.llm_provider} • 
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {item.client_id && clients[item.client_id] ? (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-medium text-zinc-700">
                        {clients[item.client_id].name}
                      </span>
                      <span className="text-sm text-zinc-500">
                        ({clients[item.client_id].company})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-orange-600 font-medium">
                        Not assigned to any client
                      </span>
                    </div>
                  )}
                  
                  {/* Show admin rejection notes if any */}
                  {item.status === 'admin_rejected' && item.revision_notes && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        <span className="font-medium">Revision needed:</span> {item.revision_notes}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAssignClient(item.id)}
                    disabled={processing === item.id}
                    className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                    title="Assign to Client"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
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
      
      {/* Client Assignment Modal */}
      <ClientAssignmentModal
        isOpen={assignmentModal.isOpen}
        onClose={() => setAssignmentModal({ isOpen: false, contentId: null })}
        onAssign={handleClientAssignment}
        currentClientId={assignmentModal.contentId ? 
          content.find(c => c.id === assignmentModal.contentId)?.client_id : undefined}
        contentPreview={assignmentModal.contentId ? 
          content.find(c => c.id === assignmentModal.contentId)?.content_text.substring(0, 150) : undefined}
      />
    </div>
  );
};

export default Approval;