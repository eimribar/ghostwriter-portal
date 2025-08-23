// =====================================================
// CLIENT ASSIGNMENT MODAL
// Modal for assigning content to specific clients
// =====================================================

import React, { useState, useEffect } from 'react';
import { X, Search, User, Building, Mail, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { enhancedClientsService } from '../services/multi-user.service';
import type { EnhancedClient } from '../types/multi-user.types';
import toast from 'react-hot-toast';

interface ClientAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (clientId: string, clientName: string) => void;
  currentClientId?: string;
  contentPreview?: string;
}

const ClientAssignmentModal: React.FC<ClientAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  currentClientId,
  contentPreview
}) => {
  const [clients, setClients] = useState<EnhancedClient[]>([]);
  const [filteredClients, setFilteredClients] = useState<EnhancedClient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(currentClientId || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter clients based on search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = clients.filter(client => 
        client.name?.toLowerCase().includes(query) ||
        client.company?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query)
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchQuery, clients]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const allClients = await enhancedClientsService.getAll();
      // Filter to only show active clients with portal access
      const activeClients = allClients.filter(c => 
        c.status === 'active' && c.portal_access === true
      );
      setClients(activeClients);
      setFilteredClients(activeClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = () => {
    if (!selectedClientId) {
      toast.error('Please select a client');
      return;
    }

    const selectedClient = clients.find(c => c.id === selectedClientId);
    if (selectedClient) {
      onAssign(selectedClientId, selectedClient.name);
      toast.success(`Content assigned to ${selectedClient.name}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900">Assign Content to Client</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        {contentPreview && (
          <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200">
            <p className="text-sm text-zinc-600 line-clamp-2">
              <span className="font-medium">Content Preview:</span> {contentPreview}
            </p>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-zinc-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, company, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
              <p className="text-sm text-zinc-500 mt-2">Loading clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500">
                {searchQuery ? 'No clients found matching your search' : 'No active clients available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={cn(
                    "w-full p-4 rounded-lg border transition-all text-left",
                    selectedClientId === client.id
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-zinc-500" />
                        <span className="font-medium text-zinc-900">{client.name}</span>
                        {currentClientId === client.id && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            Currently Assigned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-600">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {client.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </span>
                      </div>
                      {client.industry && (
                        <div className="mt-1">
                          <span className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded">
                            {client.industry}
                          </span>
                        </div>
                      )}
                    </div>
                    {selectedClientId === client.id && (
                      <div className="ml-2">
                        <div className="w-6 h-6 bg-zinc-900 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">
              {selectedClientId && (
                <span>
                  Selected: <span className="font-medium text-zinc-900">
                    {clients.find(c => c.id === selectedClientId)?.name}
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedClientId}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors",
                  selectedClientId
                    ? "bg-zinc-900 text-white hover:bg-zinc-800"
                    : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                )}
              >
                Assign to Client
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientAssignmentModal;