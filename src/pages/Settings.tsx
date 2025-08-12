import { useState } from 'react';
import { Settings as SettingsIcon, Key, Bell, Database, Shield, Save, Check, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('api');
  const [saved, setSaved] = useState(false);
  
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    apify: '',
    supabase_url: '',
    supabase_key: ''
  });

  const [notifications, setNotifications] = useState({
    email: true,
    browser: false,
    approvals: true,
    publishing: true,
    errors: true
  });

  const [general, setGeneral] = useState({
    timezone: 'America/New_York',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    defaultClient: 'all',
    postsPerPage: '25'
  });

  const handleSave = () => {
    // Save to backend
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="flex-1 bg-zinc-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Settings</h1>
            <p className="text-zinc-600 mt-1">Configure your ghostwriter portal</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'api' && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-6">API Configuration</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-zinc-700 mb-4">Language Models</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        OpenAI API Key
                      </label>
                      <input
                        type="password"
                        value={apiKeys.openai}
                        onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                      <p className="text-xs text-zinc-500 mt-1">For GPT-4 content generation</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Anthropic API Key
                      </label>
                      <input
                        type="password"
                        value={apiKeys.anthropic}
                        onChange={(e) => setApiKeys({...apiKeys, anthropic: e.target.value})}
                        placeholder="sk-ant-..."
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                      <p className="text-xs text-zinc-500 mt-1">For Claude content generation</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Google AI API Key
                      </label>
                      <input
                        type="password"
                        value={apiKeys.google}
                        onChange={(e) => setApiKeys({...apiKeys, google: e.target.value})}
                        placeholder="AIza..."
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                      <p className="text-xs text-zinc-500 mt-1">For Gemini content generation</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-zinc-700 mb-4">Data Scraping</h3>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Apify API Token
                    </label>
                    <input
                      type="password"
                      value={apiKeys.apify}
                      onChange={(e) => setApiKeys({...apiKeys, apify: e.target.value})}
                      placeholder="apify_api_..."
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <p className="text-xs text-zinc-500 mt-1">For LinkedIn content scraping</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Keep your API keys secure</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Never share your API keys or commit them to version control
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-6">Notification Preferences</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">Email Notifications</p>
                    <p className="text-sm text-zinc-600">Receive updates via email</p>
                  </div>
                  <button
                    onClick={() => setNotifications({...notifications, email: !notifications.email})}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      notifications.email ? "bg-zinc-900" : "bg-zinc-200"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.email ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">Browser Notifications</p>
                    <p className="text-sm text-zinc-600">Show desktop notifications</p>
                  </div>
                  <button
                    onClick={() => setNotifications({...notifications, browser: !notifications.browser})}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      notifications.browser ? "bg-zinc-900" : "bg-zinc-200"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.browser ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">Content Approvals</p>
                    <p className="text-sm text-zinc-600">Notify when content needs approval</p>
                  </div>
                  <button
                    onClick={() => setNotifications({...notifications, approvals: !notifications.approvals})}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      notifications.approvals ? "bg-zinc-900" : "bg-zinc-200"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.approvals ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">Publishing Updates</p>
                    <p className="text-sm text-zinc-600">Notify when content is published</p>
                  </div>
                  <button
                    onClick={() => setNotifications({...notifications, publishing: !notifications.publishing})}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      notifications.publishing ? "bg-zinc-900" : "bg-zinc-200"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.publishing ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">Error Alerts</p>
                    <p className="text-sm text-zinc-600">Notify about system errors</p>
                  </div>
                  <button
                    onClick={() => setNotifications({...notifications, errors: !notifications.errors})}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      notifications.errors ? "bg-zinc-900" : "bg-zinc-200"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.errors ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-6">General Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={general.timezone}
                    onChange={(e) => setGeneral({...general, timezone: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Language
                  </label>
                  <select
                    value={general.language}
                    onChange={(e) => setGeneral({...general, language: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Date Format
                  </label>
                  <select
                    value={general.dateFormat}
                    onChange={(e) => setGeneral({...general, dateFormat: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Default Client View
                  </label>
                  <select
                    value={general.defaultClient}
                    onChange={(e) => setGeneral({...general, defaultClient: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="all">All Clients</option>
                    <option value="recent">Recently Active</option>
                    <option value="specific">Specific Client</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Posts Per Page
                  </label>
                  <select
                    value={general.postsPerPage}
                    onChange={(e) => setGeneral({...general, postsPerPage: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-6">Database Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Supabase URL
                  </label>
                  <input
                    type="text"
                    value={apiKeys.supabase_url}
                    onChange={(e) => setApiKeys({...apiKeys, supabase_url: e.target.value})}
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Supabase Anon Key
                  </label>
                  <input
                    type="password"
                    value={apiKeys.supabase_key}
                    onChange={(e) => setApiKeys({...apiKeys, supabase_key: e.target.value})}
                    placeholder="eyJ..."
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900">Database Status</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {apiKeys.supabase_url ? 'Connected' : 'Not configured'}
                  </p>
                </div>

                <button className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
                  Test Connection
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-6">Security Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-zinc-700 mb-4">Password Requirements</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-zinc-700">Require uppercase letters</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-zinc-700">Require numbers</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-zinc-700">Require special characters</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-zinc-700">Minimum 8 characters</span>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-zinc-700 mb-4">Session Management</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-zinc-700">Auto-logout after 30 minutes of inactivity</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-zinc-700">Require re-authentication for sensitive actions</span>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-zinc-700 mb-4">Two-Factor Authentication</h3>
                  <button className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;