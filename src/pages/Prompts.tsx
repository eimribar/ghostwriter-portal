import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy, Eye, Search, Code, Hash, Zap, BarChart } from 'lucide-react';
import { cn } from '../lib/utils';
import { promptTemplatesService, type PromptTemplate } from '../services/database.service';

const Prompts = () => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<PromptTemplate>>({
    name: '',
    category: 'Content Generation',
    description: '',
    system_message: '',
    provider: 'google',
    model: 'gemini-2.5-pro',
    tags: [],
    is_active: true,
    settings: {
      temperature: 1.5,
      max_tokens: 1048576,  // 1 million tokens for Gemini
      top_p: 0.95
    }
  });

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      console.log('Loading prompts from database...');
      const data = await promptTemplatesService.getAll();
      console.log('Loaded prompts:', data.length, 'prompts');
      // Add a timestamp to force re-render
      const promptsWithTimestamp = data.map(p => ({
        ...p,
        _loadedAt: Date.now()
      }));
      setPrompts(promptsWithTimestamp);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'Content Generation', 'Content Ideation', 'Content Editing'];
  
  const filteredPrompts = prompts.filter(prompt => {
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    const matchesSearch = prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          prompt.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          prompt.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCreate = () => {
    setFormData({
      name: '',
      category: 'Content Generation',
      description: '',
      system_message: '',
      provider: 'google',
      model: 'gemini-2.5-pro',
      tags: [],
      is_active: true,
      settings: {
        temperature: 1.5,
        max_tokens: 1000,
        top_p: 0.95
      }
    });
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const handleEdit = (prompt: PromptTemplate) => {
    setFormData(prompt);
    setSelectedPrompt(prompt);
    setIsEditing(true);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      if (isEditing && selectedPrompt) {
        console.log('🔧 Updating prompt with ID:', selectedPrompt.id);
        console.log('📋 Form data being sent:', JSON.stringify(formData, null, 2));
        
        // Ensure all required fields are present
        const updateData = {
          ...selectedPrompt,  // Start with existing data
          ...formData,        // Override with form changes
          id: selectedPrompt.id,  // Ensure ID is preserved
        };
        
        console.log('📦 Complete update data:', JSON.stringify(updateData, null, 2));
        
        const success = await promptTemplatesService.update(selectedPrompt.id, updateData);
        if (success) {
          console.log('✅ Prompt updated successfully');
          alert('Prompt updated successfully!');
          
          // Force reload prompts and clear cache
          setPrompts([]); // Clear current prompts
          await loadPrompts(); // Reload from database
          
          // Close modal and reset form
          setShowCreateModal(false);
          setSelectedPrompt(null);
          setFormData({
            name: '',
            category: 'Content Generation',
            description: '',
            system_message: '',
            provider: 'google',
            model: 'gemini-2.0-flash-exp',
            tags: [],
            is_active: true,
            settings: {
              temperature: 1.5,
              max_tokens: 1048576,
              top_p: 0.95
            }
          });
        } else {
          alert('Failed to update prompt. Please try again.');
          return;
        }
      } else {
        const result = await promptTemplatesService.create(formData as Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>);
        if (result) {
          console.log('✅ Prompt created successfully');
          alert('Prompt created successfully!');
          await loadPrompts();
          setShowCreateModal(false);
          setSelectedPrompt(null);
        } else {
          alert('Failed to create prompt. Please try again.');
          return;
        }
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('An error occurred while saving the prompt.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      try {
        await promptTemplatesService.delete(id);
        await loadPrompts();
      } catch (error) {
        console.error('Error deleting prompt:', error);
      }
    }
  };

  const handleDuplicate = async (prompt: PromptTemplate) => {
    try {
      const newPrompt = {
        ...prompt,
        name: `${prompt.name} (Copy)`,
        is_default: false
      };
      delete (newPrompt as any).id;
      delete (newPrompt as any).created_at;
      delete (newPrompt as any).updated_at;
      
      await promptTemplatesService.create(newPrompt);
      await loadPrompts();
    } catch (error) {
      console.error('Error duplicating prompt:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Content Generation': return <Zap className="w-4 h-4" />;
      case 'Content Ideation': return <Hash className="w-4 h-4" />;
      case 'Content Editing': return <Edit2 className="w-4 h-4" />;
      default: return <Code className="w-4 h-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch(provider) {
      case 'openai': return 'bg-green-100 text-green-700';
      case 'anthropic': return 'bg-purple-100 text-purple-700';
      case 'google': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Prompt Management</h1>
            <p className="text-zinc-600 mt-2">
              Manage and optimize your AI prompts and workflows
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Prompt
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors capitalize",
                selectedCategory === category
                  ? "bg-zinc-900 text-white"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Prompts Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 rounded-xl">
          <Code className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <p className="text-zinc-600">No prompts found</p>
          <button
            onClick={handleCreate}
            className="mt-4 text-zinc-900 hover:underline"
          >
            Create your first prompt
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="bg-white rounded-xl border border-zinc-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(prompt.category)}
                  <span className="text-sm text-zinc-500">{prompt.category}</span>
                </div>
                <span className={cn(
                  "text-xs px-2 py-1 rounded",
                  getProviderColor(prompt.provider)
                )}>
                  {prompt.provider}
                </span>
              </div>

              <h3 className="font-semibold text-zinc-900 mb-2">{prompt.name}</h3>
              {prompt.description && (
                <p className="text-sm text-zinc-600 mb-4 line-clamp-2">{prompt.description}</p>
              )}

              {/* Tags */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {prompt.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded">
                      {tag}
                    </span>
                  ))}
                  {prompt.tags.length > 3 && (
                    <span className="text-xs px-2 py-1 text-zinc-500">
                      +{prompt.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mb-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {prompt.usage_count || 0} uses
                </div>
                {prompt.success_rate && (
                  <div className="flex items-center gap-1">
                    <BarChart className="w-3 h-3" />
                    {Math.round(prompt.success_rate * 100)}%
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Find the latest version of this prompt from the state
                    const latestPrompt = prompts.find(p => p.id === prompt.id);
                    setSelectedPrompt(latestPrompt || prompt);
                  }}
                  className="flex-1 px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded hover:bg-zinc-200 transition-colors text-sm"
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  View
                </button>
                <button
                  onClick={() => handleEdit(prompt)}
                  className="p-1.5 hover:bg-zinc-100 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-zinc-600" />
                </button>
                <button
                  onClick={() => handleDuplicate(prompt)}
                  className="p-1.5 hover:bg-zinc-100 rounded transition-colors"
                >
                  <Copy className="w-4 h-4 text-zinc-600" />
                </button>
                <button
                  onClick={() => handleDelete(prompt.id)}
                  className="p-1.5 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View/Edit Modal */}
      {(selectedPrompt || showCreateModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-zinc-200">
              <h2 className="text-xl font-semibold">
                {showCreateModal ? (isEditing ? 'Edit Prompt' : 'Create New Prompt') : 'View Prompt'}
              </h2>
            </div>

            {showCreateModal ? (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="Content Generation">Content Generation</option>
                      <option value="Content Ideation">Content Ideation</option>
                      <option value="Content Editing">Content Editing</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">System Message / Prompt</label>
                  <textarea
                    value={formData.system_message}
                    onChange={(e) => setFormData({...formData, system_message: e.target.value})}
                    rows={10}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono text-sm"
                    placeholder="Enter your prompt here..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Provider</label>
                    <select
                      value={formData.provider}
                      onChange={(e) => setFormData({...formData, provider: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="google">Google (Gemini)</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Temperature</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={formData.settings?.temperature || 1.5}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: {...formData.settings, temperature: parseFloat(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Max Tokens</label>
                    <input
                      type="number"
                      value={formData.settings?.max_tokens || 1000}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: {...formData.settings, max_tokens: parseInt(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tags?.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="linkedin, sales, b2b"
                  />
                </div>
              </div>
            ) : selectedPrompt && (
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 mb-1">Category</h3>
                    <p className="text-zinc-900">{selectedPrompt.category}</p>
                  </div>
                  {selectedPrompt.description && (
                    <div>
                      <h3 className="text-sm font-medium text-zinc-500 mb-1">Description</h3>
                      <p className="text-zinc-900">{selectedPrompt.description}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 mb-1">System Message</h3>
                    <pre className="bg-zinc-50 p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                      {selectedPrompt.system_message}
                    </pre>
                  </div>
                  {selectedPrompt.tags && selectedPrompt.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-zinc-500 mb-1">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedPrompt.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-500 mb-1">Provider</h3>
                      <p className="text-zinc-900">{selectedPrompt.provider}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-zinc-500 mb-1">Temperature</h3>
                      <p className="text-zinc-900">{selectedPrompt.settings?.temperature || 1.5}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-zinc-500 mb-1">Max Tokens</h3>
                      <p className="text-zinc-900">{selectedPrompt.settings?.max_tokens || 1000}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-zinc-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedPrompt(null);
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                {showCreateModal ? 'Cancel' : 'Close'}
              </button>
              {showCreateModal && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  {isEditing ? 'Update' : 'Create'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prompts;