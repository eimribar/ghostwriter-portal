import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'ghostwriter' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isSupabaseAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isSupabaseAuth = isSupabaseConfigured();

  useEffect(() => {
    if (isSupabaseAuth && supabase) {
      // Check for existing session
      checkUser();

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name,
            role: session.user.user_metadata?.role || 'ghostwriter',
          });
        } else {
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // Fallback to localStorage auth
      const storedUser = localStorage.getItem('ghostwriter_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    }
  }, [isSupabaseAuth]);

  const checkUser = async () => {
    try {
      if (!supabase) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
          role: session.user.user_metadata?.role || 'ghostwriter',
        });
      }
    } catch (error) {
      console.error('Error checking user session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (isSupabaseAuth && supabase) {
      // Use Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // If Supabase auth fails, try demo credentials
        if (email === 'admin@ghostwriter.com' && password === 'admin123') {
          const demoUser: User = {
            id: 'demo-user',
            email: 'admin@ghostwriter.com',
            name: 'Demo Admin',
            role: 'admin',
          };
          setUser(demoUser);
          localStorage.setItem('ghostwriter_user', JSON.stringify(demoUser));
        } else {
          throw error;
        }
      } else if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name,
          role: data.user.user_metadata?.role || 'ghostwriter',
        });
      }
    } else {
      // Fallback to demo auth
      if (email === 'admin@ghostwriter.com' && password === 'admin123') {
        const mockUser: User = {
          id: 'demo-user',
          email: 'admin@ghostwriter.com',
          name: 'Demo Admin',
          role: 'admin',
        };
        setUser(mockUser);
        localStorage.setItem('ghostwriter_user', JSON.stringify(mockUser));
      } else {
        throw new Error('Invalid credentials. Use demo account: admin@ghostwriter.com / admin123');
      }
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (isSupabaseAuth && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'ghostwriter',
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name,
          role: 'ghostwriter',
        });
      }
    } else {
      throw new Error('Sign up not available in demo mode. Use demo account to sign in.');
    }
  };

  const signOut = async () => {
    if (isSupabaseAuth && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('ghostwriter_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      isAuthenticated: !!user,
      isSupabaseAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};