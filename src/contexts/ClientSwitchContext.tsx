// =====================================================
// CLIENT SWITCH CONTEXT
// React Context for managing active client in admin portal
// =====================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { enhancedClientsService, adminSessionService } from '../services/multi-user.service';
import type { EnhancedClient, ClientSwitchContext } from '../types/multi-user.types';

const ClientSwitchContextInstance = createContext<ClientSwitchContext | undefined>(undefined);

export const useClientSwitch = (): ClientSwitchContext => {
  const context = useContext(ClientSwitchContextInstance);
  if (!context) {
    throw new Error('useClientSwitch must be used within ClientSwitchProvider');
  }
  return context;
};

interface ClientSwitchProviderProps {
  children: ReactNode;
  adminUserId: string; // Pass admin user ID from auth context
}

export const ClientSwitchProvider: React.FC<ClientSwitchProviderProps> = ({ 
  children, 
  adminUserId 
}) => {
  const [activeClient, setActiveClient] = useState<EnhancedClient | undefined>(undefined);
  const [availableClients, setAvailableClients] = useState<EnhancedClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // Load available clients on mount
  useEffect(() => {
    loadAvailableClients();
  }, []);

  // Restore active client from session on mount
  useEffect(() => {
    if (adminUserId && availableClients.length > 0) {
      restoreActiveClient();
    }
  }, [adminUserId, availableClients]);

  const loadAvailableClients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      
      const clients = await enhancedClientsService.getAll();
      setAvailableClients(clients);
      
      console.log(`✅ Loaded ${clients.length} available clients`);
    } catch (err) {
      console.error('Error loading available clients:', err);
      setError('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restoreActiveClient = useCallback(async () => {
    if (!adminUserId) return;
    
    try {
      // First check localStorage for quick restore
      const cachedClientId = localStorage.getItem('active_client_id');
      if (cachedClientId) {
        const client = availableClients.find(c => c.id === cachedClientId);
        if (client) {
          setActiveClient(client);
          console.log(`🔄 Restored active client from cache: ${client.name}`);
        }
      }
      
      // Then check database session for authoritative restore
      const session = await adminSessionService.getCurrentSession(adminUserId);
      if (session?.active_client_id) {
        const client = availableClients.find(c => c.id === session.active_client_id);
        if (client && client.id !== cachedClientId) {
          setActiveClient(client);
          localStorage.setItem('active_client_id', client.id);
          console.log(`🔄 Restored active client from database: ${client.name}`);
        }
      }
      
    } catch (err) {
      console.error('Error restoring active client:', err);
      // Don't set error state for restore failures, just log
    }
  }, [adminUserId, availableClients]);

  const switchToClient = useCallback(async (clientId: string): Promise<void> => {
    if (!adminUserId) {
      throw new Error('Admin user ID not available');
    }
    
    try {
      setIsLoading(true);
      setError(undefined);
      
      // Find the client in available clients
      const client = availableClients.find(c => c.id === clientId);
      if (!client) {
        throw new Error('Client not found');
      }
      
      // Update session in database
      const session = await adminSessionService.switchToClient(adminUserId, clientId);
      if (!session) {
        throw new Error('Failed to update admin session');
      }
      
      // Update local state
      setActiveClient(client);
      
      // Fire custom event for other components to listen
      window.dispatchEvent(new CustomEvent('clientSwitched', { 
        detail: { 
          previousClient: activeClient,
          newClient: client,
          adminUserId,
          session
        }
      }));
      
      console.log(`✅ Switched to client: ${client.name} (${client.company})`);
      
    } catch (err) {
      console.error('Error switching to client:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch client');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [adminUserId, availableClients, activeClient]);

  const clearActiveClient = useCallback(async (): Promise<void> => {
    if (!adminUserId) {
      throw new Error('Admin user ID not available');
    }
    
    try {
      setIsLoading(true);
      setError(undefined);
      
      // Clear session in database
      const success = await adminSessionService.clearActiveClient(adminUserId);
      if (!success) {
        throw new Error('Failed to clear admin session');
      }
      
      // Update local state
      const previousClient = activeClient;
      setActiveClient(undefined);
      
      // Fire custom event
      window.dispatchEvent(new CustomEvent('clientCleared', { 
        detail: { 
          previousClient,
          adminUserId
        }
      }));
      
      console.log('✅ Cleared active client');
      
    } catch (err) {
      console.error('Error clearing active client:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear active client');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [adminUserId, activeClient]);

  // Keyboard shortcut for quick client switching (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k' && !event.shiftKey) {
        event.preventDefault();
        
        // Fire custom event for UI components to show client switcher modal
        window.dispatchEvent(new CustomEvent('showClientSwitcher'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-refresh clients periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        loadAvailableClients();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isLoading, loadAvailableClients]);

  const contextValue: ClientSwitchContext = {
    activeClient,
    availableClients,
    switchToClient,
    clearActiveClient,
    isLoading,
    error
  };

  return (
    <ClientSwitchContextInstance.Provider value={contextValue}>
      {children}
    </ClientSwitchContextInstance.Provider>
  );
};

// =====================================================
// HOOKS FOR COMMON OPERATIONS
// =====================================================

/**
 * Hook to get the current active client ID
 */
export const useActiveClientId = (): string | undefined => {
  const { activeClient } = useClientSwitch();
  return activeClient?.id;
};

/**
 * Hook to check if a specific client is active
 */
export const useIsClientActive = (clientId: string): boolean => {
  const { activeClient } = useClientSwitch();
  return activeClient?.id === clientId;
};

/**
 * Hook to get client-specific data with automatic filtering
 */
export const useClientSpecificData = <T extends any>(
  fetchFunction: (clientId: string) => Promise<T>,
  dependencies: any[] = []
) => {
  const { activeClient } = useClientSwitch();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeClient?.id) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchFunction(activeClient.id)
      .then(result => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'Failed to fetch data');
          console.error('Error fetching client-specific data:', err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeClient?.id, fetchFunction, ...dependencies]);

  return { data, loading, error, refetch: () => fetchFunction(activeClient?.id || '') };
};

/**
 * Hook to show client switcher modal
 */
export const useShowClientSwitcher = () => {
  return useCallback(() => {
    window.dispatchEvent(new CustomEvent('showClientSwitcher'));
  }, []);
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get active client from localStorage (for use outside React components)
 */
export const getActiveClientIdFromStorage = (): string | null => {
  return localStorage.getItem('active_client_id');
};

/**
 * Subscribe to client switch events (for use in non-React code)
 */
export const subscribeToClientSwitch = (
  callback: (event: CustomEvent) => void
): (() => void) => {
  const handleClientSwitched = (event: Event) => callback(event as CustomEvent);
  const handleClientCleared = (event: Event) => callback(event as CustomEvent);
  
  window.addEventListener('clientSwitched', handleClientSwitched);
  window.addEventListener('clientCleared', handleClientCleared);
  
  return () => {
    window.removeEventListener('clientSwitched', handleClientSwitched);
    window.removeEventListener('clientCleared', handleClientCleared);
  };
};

export default ClientSwitchProvider;