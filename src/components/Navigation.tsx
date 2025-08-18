import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Database, Sparkles, Calendar, BarChart3, Settings, Users, Lightbulb, LogOut, CheckSquare, FileCode, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generatedContentService } from '../services/database.service';

const Navigation = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  
  useEffect(() => {
    loadPendingCount();
    // Refresh count every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const loadPendingCount = async () => {
    try {
      const allContent = await generatedContentService.getAll();
      const pending = allContent.filter(c => c.status === 'draft');
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  };
  
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
      isActive 
        ? "bg-zinc-900 text-white" 
        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
    );

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <nav className="w-64 bg-white border-r border-zinc-200 h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-zinc-900">Ghostwriter Portal</h1>
        <p className="text-sm text-zinc-500 mt-1">Content Engine Admin</p>
        {user && (
          <p className="text-xs text-zinc-400 mt-2">{user.email}</p>
        )}
      </div>

      <div className="flex-1 space-y-1">
        <NavLink to="/content-lake" className={linkClass}>
          <Database className="h-4 w-4" />
          Content Lake
        </NavLink>
        
        <NavLink to="/ideation" className={linkClass}>
          <Lightbulb className="h-4 w-4" />
          Ideation
        </NavLink>
        
        <NavLink to="/generate" className={linkClass}>
          <Sparkles className="h-4 w-4" />
          Generate
        </NavLink>
        
        <NavLink to="/approval" className={linkClass}>
          <CheckSquare className="h-4 w-4" />
          <span className="flex-1">Approval Queue</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {pendingCount}
            </span>
          )}
        </NavLink>
        
        <NavLink to="/prompts" className={linkClass}>
          <FileCode className="h-4 w-4" />
          Prompts
        </NavLink>
        
        <NavLink to="/schedule" className={linkClass}>
          <Calendar className="h-4 w-4" />
          Schedule
        </NavLink>
        
        <NavLink to="/analytics" className={linkClass}>
          <BarChart3 className="h-4 w-4" />
          Analytics
        </NavLink>
        
        <NavLink to="/clients" className={linkClass}>
          <Users className="h-4 w-4" />
          Clients
        </NavLink>
        
        <NavLink to="/slack-settings" className={linkClass}>
          <MessageSquare className="h-4 w-4" />
          Slack
        </NavLink>
        
        <div className="pt-4 mt-4 border-t border-zinc-200">
          <NavLink to="/settings" className={linkClass}>
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        </div>
      </div>
      
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </nav>
  );
};

export default Navigation;