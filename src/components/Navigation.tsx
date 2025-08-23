import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Database, Sparkles, Calendar, BarChart3, Settings, Users, Lightbulb, LogOut, CheckSquare, FileCode, MessageSquare, MessageCircle, CalendarDays, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generatedContentService } from '../services/database.service';
import { ClientSwitcher } from './ClientSwitcher';
import { useClientSwitch } from '../contexts/ClientSwitchContext';
import NotificationBell from './NotificationBell';

const Navigation = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { activeClient } = useClientSwitch();
  const [counts, setCounts] = useState({ drafts: 0, feedback: 0 });
  
  useEffect(() => {
    loadCounts();
    // Refresh count every 30 seconds
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, [activeClient]);
  
  const loadCounts = async () => {
    try {
      const allContent = await generatedContentService.getAll();
      let drafts = allContent.filter(c => c.status === 'draft' || c.status === 'admin_rejected');
      let feedback = allContent.filter(c => 
        c.status === 'client_approved' || 
        c.status === 'client_rejected' || 
        c.status === 'client_edited'
      );
      
      // Filter by active client if selected
      if (activeClient) {
        drafts = drafts.filter(c => c.client_id === activeClient.id);
        feedback = feedback.filter(c => c.client_id === activeClient.id);
      }
      
      setCounts({ drafts: drafts.length, feedback: feedback.length });
    } catch (error) {
      console.error('Error loading counts:', error);
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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Ghostwriter Portal</h1>
            <p className="text-sm text-zinc-500 mt-1">Content Engine Admin</p>
            {user && (
              <p className="text-xs text-zinc-400 mt-2">{user.email}</p>
            )}
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Client Switcher */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Active Client
          </h3>
          {activeClient && (
            <span className="text-xs text-zinc-400">
              {activeClient.industry || 'General'}
            </span>
          )}
        </div>
        <ClientSwitcher className="w-full" />
        {activeClient && (
          <div className="mt-2 p-2 bg-zinc-50 rounded-lg">
            <div className="text-xs text-zinc-600">
              <div className="font-medium">{activeClient.company}</div>
              <div className="text-zinc-500 mt-0.5">
                {activeClient.content_preferences?.tone?.slice(0, 2).join(', ')}
                {activeClient.content_preferences?.tone && activeClient.content_preferences.tone.length > 2 && (
                  <span> +{activeClient.content_preferences.tone.length - 2} more</span>
                )}
              </div>
            </div>
          </div>
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
          <span className="flex-1">Admin Approval</span>
          {counts.drafts > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {counts.drafts}
            </span>
          )}
        </NavLink>
        
        <NavLink to="/client-feedback" className={linkClass}>
          <MessageCircle className="h-4 w-4" />
          <span className="flex-1">Client Feedback</span>
          {counts.feedback > 0 && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
              {counts.feedback}
            </span>
          )}
        </NavLink>
        
        <NavLink to="/calendar" className={linkClass}>
          <CalendarDays className="h-4 w-4" />
          <span className="flex-1">Content Calendar</span>
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
        
        <NavLink to="/admin-client-auth" className={linkClass}>
          <Shield className="h-4 w-4" />
          Client Auth
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