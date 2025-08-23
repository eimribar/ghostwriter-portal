// =====================================================
// CLIENT SWITCHER COMPONENT
// Dropdown component for switching between clients in admin portal
// =====================================================

import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Users, Search, Plus, Settings, Loader2, AlertCircle } from 'lucide-react';
import { useClientSwitch } from '../contexts/ClientSwitchContext';
import { cn } from '../lib/utils';

interface ClientSwitcherProps {
  className?: string;
  showAllOption?: boolean;
}

export const ClientSwitcher: React.FC<ClientSwitcherProps> = ({
  className = '',
  showAllOption = true
}) => {
  const { 
    activeClient, 
    availableClients, 
    switchToClient, 
    clearActiveClient, 
    isLoading, 
    error 
  } = useClientSwitch();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown and clear search on client switch
  useEffect(() => {
    setIsOpen(false);
    setSearchQuery('');
    setSwitching(null);
  }, [activeClient]);

  // Handle keyboard shortcuts for opening dropdown
  useEffect(() => {
    const handleShowSwitcher = () => {
      setIsOpen(true);
    };

    window.addEventListener('showClientSwitcher', handleShowSwitcher);
    return () => window.removeEventListener('showClientSwitcher', handleShowSwitcher);
  }, []);

  // Filter clients based on search query
  const filteredClients = availableClients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSwitchToClient = async (clientId: string) => {
    try {
      setSwitching(clientId);
      await switchToClient(clientId);
    } catch (error) {
      console.error('Failed to switch client:', error);
      // Error is handled by the context, we just need to reset switching state
      setSwitching(null);
    }
  };

  const handleClearClient = async () => {
    try {
      setSwitching('clear');
      await clearActiveClient();
    } catch (error) {
      console.error('Failed to clear client:', error);
      setSwitching(null);
    }
  };

  const getClientInitials = (client: { name: string; company: string }) => {
    const name = client.name.trim();
    const company = client.company.trim();
    
    if (name) {
      const nameParts = name.split(' ');
      return nameParts.length > 1 
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    
    return company.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'onboarding': return 'bg-blue-100 text-blue-700';
      case 'churned': return 'bg-red-100 text-red-700';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-left",
          "border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent",
          isOpen && "ring-2 ring-zinc-900 border-transparent"
        )}
        disabled={isLoading}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {activeClient ? (
            <>
              {/* Client Avatar */}
              <div className="flex-shrink-0 w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                {getClientInitials(activeClient)}
              </div>
              
              {/* Client Info */}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-900 truncate">
                  {activeClient.name}
                </div>
                <div className="text-xs text-zinc-500 truncate">
                  {activeClient.company}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* All Clients View */}
              <div className="flex-shrink-0 w-8 h-8 bg-zinc-100 text-zinc-600 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-900">
                  All Clients
                </div>
                <div className="text-xs text-zinc-500">
                  Global view • {availableClients.length} clients
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Status & Arrow */}
        <div className="flex items-center gap-2">
          {activeClient && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              getStatusColor(activeClient.status)
            )}>
              {activeClient.status}
            </span>
          )}
          
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
          ) : (
            <ChevronDown className={cn(
              "w-4 h-4 text-zinc-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          )}
        </div>
      </button>

      {/* Error Display */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50">
          {/* Search Box */}
          <div className="p-3 border-b border-zinc-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Client List */}
          <div className="max-h-[300px] overflow-y-auto">
            {/* All Clients Option */}
            {showAllOption && (
              <button
                onClick={handleClearClient}
                disabled={switching === 'clear'}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 hover:bg-zinc-50 transition-colors",
                  !activeClient && "bg-zinc-50"
                )}
              >
                <div className="flex-shrink-0 w-8 h-8 bg-zinc-100 text-zinc-600 rounded-full flex items-center justify-center">
                  {switching === 'clear' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="font-medium text-zinc-900">All Clients</div>
                  <div className="text-xs text-zinc-500">Global view across all clients</div>
                </div>
                
                {!activeClient && (
                  <Check className="w-4 h-4 text-zinc-900" />
                )}
              </button>
            )}

            {/* Individual Clients */}
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSwitchToClient(client.id)}
                  disabled={switching === client.id}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 hover:bg-zinc-50 transition-colors",
                    activeClient?.id === client.id && "bg-zinc-50"
                  )}
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    {switching === client.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      getClientInitials(client)
                    )}
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-zinc-900 truncate">
                      {client.name}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {client.company} • {client.email}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      getStatusColor(client.status)
                    )}>
                      {client.status}
                    </span>
                    
                    {activeClient?.id === client.id && (
                      <Check className="w-4 h-4 text-zinc-900" />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-8 text-center text-zinc-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                <div className="text-sm">
                  {searchQuery ? 'No clients found' : 'No clients available'}
                </div>
                {searchQuery && (
                  <div className="text-xs mt-1">
                    Try adjusting your search terms
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-zinc-100 bg-zinc-50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                {filteredClients.length} of {availableClients.length} clients
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open('/clients', '_blank')}
                  className="text-xs text-zinc-600 hover:text-zinc-900 flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  Manage
                </button>
                
                <button
                  onClick={() => window.open('/clients/new', '_blank')}
                  className="text-xs text-zinc-600 hover:text-zinc-900 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Client
                </button>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-zinc-400">
              Press <kbd className="px-1.5 py-0.5 bg-zinc-200 rounded text-zinc-600">⌘K</kbd> to open
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// COMPACT CLIENT SWITCHER
// Smaller version for mobile or constrained spaces
// =====================================================

interface CompactClientSwitcherProps {
  className?: string;
}

export const CompactClientSwitcher: React.FC<CompactClientSwitcherProps> = ({
  className = ''
}) => {
  const { activeClient, isLoading } = useClientSwitch();
  const [isOpen, setIsOpen] = useState(false);
  
  const getClientInitials = (client: { name: string; company: string }) => {
    const name = client.name.trim();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-zinc-100 transition-colors"
        disabled={isLoading}
      >
        {activeClient ? (
          <>
            <div className="w-6 h-6 bg-zinc-900 text-white rounded-full flex items-center justify-center text-xs font-semibold">
              {getClientInitials(activeClient)}
            </div>
            <span className="text-sm font-medium text-zinc-900 hidden sm:inline">
              {activeClient.name}
            </span>
          </>
        ) : (
          <>
            <Users className="w-6 h-6 text-zinc-600" />
            <span className="text-sm font-medium text-zinc-900 hidden sm:inline">
              All Clients
            </span>
          </>
        )}
        
        <ChevronDown className="w-4 h-4 text-zinc-400" />
      </button>
      
      {/* Add dropdown logic here if needed */}
    </div>
  );
};

export default ClientSwitcher;