import { useState } from 'react';
import { Users, Plus, Edit2, Calendar, Mail, Phone, Globe, Linkedin, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  linkedinUrl: string;
  website?: string;
  industry: string;
  status: 'active' | 'paused' | 'onboarding';
  joinedDate: Date;
  postingFrequency: string;
  contentPreferences: {
    tone: string[];
    topics: string[];
    formats: string[];
    avoid: string[];
  };
  stats: {
    totalPosts: number;
    avgEngagement: number;
    pendingApprovals: number;
    scheduledPosts: number;
  };
  brandGuidelines?: string;
  notes?: string;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      name: 'Amnon Cohen',
      company: 'Bounce AI',
      email: 'amnon@bounce.ai',
      phone: '+1 234 567 8900',
      linkedinUrl: 'https://linkedin.com/in/amnoncohen',
      website: 'https://bounce.ai',
      industry: 'AI/ML',
      status: 'active',
      joinedDate: new Date('2024-01-15'),
      postingFrequency: '3x per week',
      contentPreferences: {
        tone: ['professional', 'thought-leadership'],
        topics: ['AI innovation', 'product development', 'startup growth'],
        formats: ['insights', 'case studies', 'tips'],
        avoid: ['political topics', 'competitors']
      },
      stats: {
        totalPosts: 45,
        avgEngagement: 8.5,
        pendingApprovals: 2,
        scheduledPosts: 5
      },
      brandGuidelines: 'Focus on practical AI applications and real-world impact',
      notes: 'Prefers data-driven content with concrete examples'
    },
    {
      id: '2',
      name: 'Sarah Chen',
      company: 'TechFlow',
      email: 'sarah@techflow.io',
      linkedinUrl: 'https://linkedin.com/in/sarahchen',
      industry: 'SaaS',
      status: 'active',
      joinedDate: new Date('2024-02-01'),
      postingFrequency: '2x per week',
      contentPreferences: {
        tone: ['conversational', 'educational'],
        topics: ['product management', 'user experience', 'growth'],
        formats: ['how-to', 'lessons learned', 'trends'],
        avoid: ['technical jargon']
      },
      stats: {
        totalPosts: 28,
        avgEngagement: 6.2,
        pendingApprovals: 1,
        scheduledPosts: 3
      }
    },
    {
      id: '3',
      name: 'Marcus Johnson',
      company: 'DataPro Analytics',
      email: 'marcus@datapro.com',
      linkedinUrl: 'https://linkedin.com/in/marcusjohnson',
      industry: 'Data Analytics',
      status: 'onboarding',
      joinedDate: new Date('2024-03-10'),
      postingFrequency: '1x per week',
      contentPreferences: {
        tone: ['analytical', 'professional'],
        topics: ['data insights', 'business intelligence', 'analytics'],
        formats: ['data stories', 'research', 'infographics'],
        avoid: []
      },
      stats: {
        totalPosts: 0,
        avgEngagement: 0,
        pendingApprovals: 0,
        scheduledPosts: 0
      }
    }
  ]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [newClient, setNewClient] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    website: '',
    industry: '',
    postingFrequency: '2x per week',
    tone: '',
    topics: '',
    formats: '',
    avoid: '',
    brandGuidelines: '',
    notes: ''
  });

  const industries = ['AI/ML', 'SaaS', 'FinTech', 'HealthTech', 'E-commerce', 'Data Analytics', 'Cybersecurity', 'Other'];
  const frequencies = ['Daily', '3x per week', '2x per week', '1x per week', 'Bi-weekly'];

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchQuery || 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'paused': return 'text-yellow-600 bg-yellow-50';
      case 'onboarding': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'paused': return <Clock className="h-4 w-4" />;
      case 'onboarding': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleCreateClient = () => {
    if (!newClient.name || !newClient.company || !newClient.email) return;

    const client: Client = {
      id: String(clients.length + 1),
      name: newClient.name,
      company: newClient.company,
      email: newClient.email,
      phone: newClient.phone,
      linkedinUrl: newClient.linkedinUrl,
      website: newClient.website,
      industry: newClient.industry || 'Other',
      status: 'onboarding',
      joinedDate: new Date(),
      postingFrequency: newClient.postingFrequency,
      contentPreferences: {
        tone: newClient.tone.split(',').map(t => t.trim()).filter(Boolean),
        topics: newClient.topics.split(',').map(t => t.trim()).filter(Boolean),
        formats: newClient.formats.split(',').map(t => t.trim()).filter(Boolean),
        avoid: newClient.avoid.split(',').map(t => t.trim()).filter(Boolean)
      },
      stats: {
        totalPosts: 0,
        avgEngagement: 0,
        pendingApprovals: 0,
        scheduledPosts: 0
      },
      brandGuidelines: newClient.brandGuidelines,
      notes: newClient.notes
    };

    setClients([...clients, client]);
    setShowNewClientModal(false);
    setNewClient({
      name: '',
      company: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      website: '',
      industry: '',
      postingFrequency: '2x per week',
      tone: '',
      topics: '',
      formats: '',
      avoid: '',
      brandGuidelines: '',
      notes: ''
    });
  };

  return (
    <div className="flex-1 bg-zinc-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Clients</h1>
            <p className="text-zinc-600 mt-1">Manage your content clients and their preferences</p>
          </div>
          <button 
            onClick={() => setShowNewClientModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Total Clients</p>
                <p className="text-2xl font-bold text-zinc-900">{clients.length}</p>
              </div>
              <Users className="h-8 w-8 text-zinc-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {clients.filter(c => c.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {clients.reduce((sum, c) => sum + c.stats.pendingApprovals, 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Scheduled Posts</p>
                <p className="text-2xl font-bold text-blue-600">
                  {clients.reduce((sum, c) => sum + c.stats.scheduledPosts, 0)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-300" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="onboarding">Onboarding</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <div 
            key={client.id}
            className="bg-white rounded-lg border border-zinc-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 text-lg">{client.name}</h3>
                  <p className="text-zinc-600">{client.company}</p>
                  <p className="text-sm text-zinc-500">{client.industry}</p>
                </div>
                <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1", getStatusColor(client.status))}>
                  {getStatusIcon(client.status)}
                  {client.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Mail className="h-4 w-4" />
                  {client.email}
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Phone className="h-4 w-4" />
                    {client.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Linkedin className="h-4 w-4" />
                  <a href={client.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900">
                    View Profile
                  </a>
                </div>
                {client.website && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Globe className="h-4 w-4" />
                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900">
                      {client.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-zinc-100">
                <div>
                  <p className="text-xs text-zinc-500">Posting</p>
                  <p className="text-sm font-medium text-zinc-900">{client.postingFrequency}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Total Posts</p>
                  <p className="text-sm font-medium text-zinc-900">{client.stats.totalPosts}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Avg Engagement</p>
                  <p className="text-sm font-medium text-zinc-900">{client.stats.avgEngagement}%</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Pending</p>
                  <p className="text-sm font-medium text-yellow-600">{client.stats.pendingApprovals}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-zinc-500 mb-2">Content Topics</p>
                <div className="flex flex-wrap gap-1">
                  {client.contentPreferences.topics.slice(0, 3).map((topic, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-zinc-100 rounded">
                      {topic}
                    </span>
                  ))}
                  {client.contentPreferences.topics.length > 3 && (
                    <span className="text-xs px-2 py-1 bg-zinc-100 rounded">
                      +{client.contentPreferences.topics.length - 3}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setSelectedClient(client)}
                  className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-sm"
                >
                  View Details
                </button>
                <button className="px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Add New Client</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Company *</label>
                  <input
                    type="text"
                    value={newClient.company}
                    onChange={(e) => setNewClient({...newClient, company: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={newClient.linkedinUrl}
                    onChange={(e) => setNewClient({...newClient, linkedinUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={newClient.website}
                    onChange={(e) => setNewClient({...newClient, website: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Industry</label>
                  <select
                    value={newClient.industry}
                    onChange={(e) => setNewClient({...newClient, industry: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">Select industry...</option>
                    {industries.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Posting Frequency</label>
                  <select
                    value={newClient.postingFrequency}
                    onChange={(e) => setNewClient({...newClient, postingFrequency: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    {frequencies.map(freq => (
                      <option key={freq} value={freq}>{freq}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-zinc-900 mb-3">Content Preferences</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Tone (comma separated)</label>
                    <input
                      type="text"
                      value={newClient.tone}
                      onChange={(e) => setNewClient({...newClient, tone: e.target.value})}
                      placeholder="professional, thought-leadership, conversational..."
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Topics (comma separated)</label>
                    <input
                      type="text"
                      value={newClient.topics}
                      onChange={(e) => setNewClient({...newClient, topics: e.target.value})}
                      placeholder="AI innovation, startup growth, leadership..."
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Content Formats (comma separated)</label>
                    <input
                      type="text"
                      value={newClient.formats}
                      onChange={(e) => setNewClient({...newClient, formats: e.target.value})}
                      placeholder="insights, case studies, how-to guides..."
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Topics to Avoid (comma separated)</label>
                    <input
                      type="text"
                      value={newClient.avoid}
                      onChange={(e) => setNewClient({...newClient, avoid: e.target.value})}
                      placeholder="politics, competitors, controversial topics..."
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Brand Guidelines</label>
                <textarea
                  value={newClient.brandGuidelines}
                  onChange={(e) => setNewClient({...newClient, brandGuidelines: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 h-20 resize-none"
                  placeholder="Key brand messaging, voice guidelines, specific requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Internal Notes</label>
                <textarea
                  value={newClient.notes}
                  onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 h-20 resize-none"
                  placeholder="Any additional notes about the client..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowNewClientModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClient}
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Add Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedClient(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">{selectedClient.name}</h2>
                <p className="text-zinc-600">{selectedClient.company} • {selectedClient.industry}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1", getStatusColor(selectedClient.status))}>
                    {getStatusIcon(selectedClient.status)}
                    {selectedClient.status}
                  </span>
                  <span className="text-sm text-zinc-500">
                    Client since {new Date(selectedClient.joinedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClient(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-zinc-900 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <span>{selectedClient.email}</span>
                  </div>
                  {selectedClient.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-zinc-400" />
                      <span>{selectedClient.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Linkedin className="h-4 w-4 text-zinc-400" />
                    <a href={selectedClient.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      LinkedIn Profile
                    </a>
                  </div>
                  {selectedClient.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-zinc-400" />
                      <a href={selectedClient.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {selectedClient.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-zinc-900 mb-3">Content Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Total Posts</p>
                    <p className="text-xl font-bold text-zinc-900">{selectedClient.stats.totalPosts}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Avg Engagement</p>
                    <p className="text-xl font-bold text-zinc-900">{selectedClient.stats.avgEngagement}%</p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Pending</p>
                    <p className="text-xl font-bold text-yellow-600">{selectedClient.stats.pendingApprovals}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Scheduled</p>
                    <p className="text-xl font-bold text-blue-600">{selectedClient.stats.scheduledPosts}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-200">
              <h3 className="font-medium text-zinc-900 mb-3">Content Preferences</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-2">Tone</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedClient.contentPreferences.tone.map((t, i) => (
                      <span key={i} className="px-2 py-1 bg-zinc-100 rounded text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-2">Content Formats</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedClient.contentPreferences.formats.map((f, i) => (
                      <span key={i} className="px-2 py-1 bg-zinc-100 rounded text-xs">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-2">Topics</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedClient.contentPreferences.topics.map((t, i) => (
                      <span key={i} className="px-2 py-1 bg-green-100 rounded text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-2">Topics to Avoid</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedClient.contentPreferences.avoid.map((a, i) => (
                      <span key={i} className="px-2 py-1 bg-red-100 rounded text-xs">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {selectedClient.brandGuidelines && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-zinc-700 mb-2">Brand Guidelines</p>
                  <p className="text-sm text-zinc-600 bg-zinc-50 rounded-lg p-3">
                    {selectedClient.brandGuidelines}
                  </p>
                </div>
              )}

              {selectedClient.notes && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-zinc-700 mb-2">Internal Notes</p>
                  <p className="text-sm text-zinc-600 bg-yellow-50 rounded-lg p-3">
                    {selectedClient.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                Edit Client
              </button>
              <button className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
                View Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;