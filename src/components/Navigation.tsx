import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Database, Sparkles, Calendar, BarChart3, Settings, Users, Lightbulb } from 'lucide-react';

const Navigation = () => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
      isActive 
        ? "bg-zinc-900 text-white" 
        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
    );

  return (
    <nav className="w-64 bg-white border-r border-zinc-200 h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-zinc-900">Ghostwriter Portal</h1>
        <p className="text-sm text-zinc-500 mt-1">Content Engine Admin</p>
      </div>

      <div className="space-y-1">
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
        
        <div className="pt-4 mt-4 border-t border-zinc-200">
          <NavLink to="/settings" className={linkClass}>
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;