import { ArrowUpRight, Building2, User } from 'lucide-react';

const PortalSwitcher = () => {
  const currentPortal = 'ghostwriter';
  const userPortalUrl = import.meta.env.PROD 
    ? 'https://unified-linkedin-project.vercel.app' 
    : 'http://localhost:8080';
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a
        href={userPortalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors shadow-lg"
      >
        <User className="w-4 h-4" />
        <span className="text-sm font-medium">Switch to User Portal</span>
        <ArrowUpRight className="w-3 h-3" />
      </a>
    </div>
  );
};

export default PortalSwitcher;