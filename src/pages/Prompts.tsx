import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Copy, Eye, Search, Code, Hash, Zap, BarChart, Play, Loader2, Download, Upload } from 'lucide-react';
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
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPrompt, setTestPrompt] = useState<PromptTemplate | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
        
        // Send only the form data, not the merged object
        const success = await promptTemplatesService.update(selectedPrompt.id, formData);
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

  const handleTestPrompt = (prompt: PromptTemplate) => {
    setTestPrompt(prompt);
    setTestInput('');
    setTestOutput('');
    setShowTestModal(true);
  };

  const togglePromptSelection = (promptId: string) => {
    const newSelection = new Set(selectedPrompts);
    if (newSelection.has(promptId)) {
      newSelection.delete(promptId);
    } else {
      newSelection.add(promptId);
    }
    setSelectedPrompts(newSelection);
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete' | 'duplicate') => {
    const promptIds = Array.from(selectedPrompts);
    if (promptIds.length === 0) {
      alert('No prompts selected');
      return;
    }

    if (action === 'delete' && !confirm(`Are you sure you want to delete ${promptIds.length} prompts?`)) {
      return;
    }

    try {
      for (const id of promptIds) {
        if (action === 'delete') {
          await promptTemplatesService.delete(id);
        } else if (action === 'activate') {
          await promptTemplatesService.update(id, { is_active: true });
        } else if (action === 'deactivate') {
          await promptTemplatesService.update(id, { is_active: false });
        } else if (action === 'duplicate') {
          const originalPrompt = prompts.find(p => p.id === id);
          if (originalPrompt) {
            const newPrompt = {
              ...originalPrompt,
              name: `${originalPrompt.name} (Copy)`,
              is_default: false
            };
            delete (newPrompt as any).id;
            delete (newPrompt as any).created_at;
            delete (newPrompt as any).updated_at;
            await promptTemplatesService.create(newPrompt);
          }
        }
      }
      
      await loadPrompts();
      setSelectedPrompts(new Set());
      setBulkMode(false);
      alert(`Bulk ${action} completed successfully!`);
    } catch (error) {
      console.error('Bulk action error:', error);
      alert('An error occurred during bulk operation.');
    }
  };

  const exportPrompts = () => {
    const dataToExport = filteredPrompts.map(prompt => ({
      name: prompt.name,
      category: prompt.category,
      description: prompt.description,
      system_message: prompt.system_message,
      provider: prompt.provider,
      model: prompt.model,
      tags: prompt.tags,
      settings: prompt.settings
    }));
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts_${selectedCategory}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importPrompts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedPrompts = JSON.parse(e.target?.result as string);
        
        if (!Array.isArray(importedPrompts)) {
          alert('Invalid file format. Please select a valid prompts JSON file.');
          return;
        }

        let importCount = 0;
        for (const promptData of importedPrompts) {
          try {
            await promptTemplatesService.create({
              ...promptData,
              name: `${promptData.name} (Imported)`,
              is_active: true
            });
            importCount++;
          } catch (error) {
            console.error('Error importing prompt:', promptData.name, error);
          }
        }
        
        await loadPrompts();
        alert(`Successfully imported ${importCount} prompts!`);
      } catch (error) {
        console.error('Import error:', error);
        alert('Error reading file. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const runTest = async () => {
    if (!testPrompt || !testInput.trim()) {
      alert('Please enter test input');
      return;
    }

    setTestLoading(true);
    setTestOutput('');

    try {
      const { generateWithPrompt } = await import('../lib/llm-service');
      const results = await generateWithPrompt(testInput, testPrompt, 1);
      
      if (results && results.length > 0) {
        setTestOutput(results[0].content);
      } else {
        setTestOutput('No output generated');
      }
    } catch (error) {
      console.error('Test error:', error);
      setTestOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestLoading(false);
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
          <div className="flex gap-2">
            <div className="flex gap-1 border-r border-zinc-200 pr-2 mr-1">
              <button
                onClick={exportPrompts}
                className="px-3 py-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors flex items-center gap-2"
                title="Export prompts to JSON file"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <input
                type="file"
                accept=".json"
                onChange={importPrompts}
                className="hidden"
                ref={fileInputRef}
              />
              <button
                onClick={() => fileInputRef?.click()}
                className="px-3 py-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors flex items-center gap-2"
                title="Import prompts from JSON file"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
            </div>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors flex items-center gap-2",
                bulkMode 
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {bulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Prompt
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {bulkMode && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedPrompts.size} prompt{selectedPrompts.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => {
                  const allPromptIds = new Set(filteredPrompts.map(p => p.id));
                  setSelectedPrompts(allPromptIds);
                }}
                className="text-sm text-blue-700 hover:text-blue-900 underline"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedPrompts(new Set())}
                className="text-sm text-blue-700 hover:text-blue-900 underline"
              >
                Clear Selection
              </button>
            </div>
            
            {selectedPrompts.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkAction('duplicate')}
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
              className={cn(
                "bg-white rounded-xl border p-6 hover:shadow-lg transition-all",
                bulkMode && selectedPrompts.has(prompt.id) 
                  ? "border-blue-300 ring-2 ring-blue-100"
                  : "border-zinc-200"
              )}
            >
              {/* Bulk Mode Checkbox */}
              {bulkMode && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPrompts.has(prompt.id)}
                      onChange={() => togglePromptSelection(prompt.id)}
                      className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-zinc-600">Select this prompt</span>
                  </label>
                </div>
              )}
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
              {!bulkMode && (
                <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Find the latest version of this prompt from the state
                    const latestPrompt = prompts.find(p => p.id === prompt.id);
                    setSelectedPrompt(latestPrompt || prompt);
                  }}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded hover:bg-zinc-200 transition-colors text-sm"
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  View
                </button>
                <button
                  onClick={() => handleTestPrompt(prompt)}
                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
                >
                  <Play className="w-3 h-3 inline mr-1" />
                  Test
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
              )}
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

      {/* Test Prompt Modal */}
      {showTestModal && testPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-zinc-200">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Play className="w-5 h-5 text-green-600" />
                Test Prompt: {testPrompt.name}
              </h2>
              <p className="text-sm text-zinc-600 mt-1">
                Test your prompt with sample input to see how it performs
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Input */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-700 mb-2">Prompt Details</h3>
                  <div className="p-3 bg-zinc-50 rounded-lg text-xs">
                    <p><strong>Category:</strong> {testPrompt.category}</p>
                    <p><strong>Provider:</strong> {testPrompt.provider}</p>
                    <p><strong>Temperature:</strong> {testPrompt.settings?.temperature || 1.5}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Test Input
                  </label>
                  <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter your test content idea here..."
                    rows={6}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                  />
                </div>

                <button
                  onClick={runTest}
                  disabled={testLoading || !testInput.trim()}
                  className={cn(
                    "w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
                    testLoading || !testInput.trim()
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  )}
                >
                  {testLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing Prompt...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Test
                    </>
                  )}
                </button>
              </div>

              {/* Right Column - Output */}
              <div>
                <h3 className="text-sm font-medium text-zinc-700 mb-2">Generated Output</h3>
                <div className="h-80 border border-zinc-200 rounded-lg p-3 overflow-y-auto bg-zinc-50">
                  {testLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                  ) : testOutput ? (
                    <div className="whitespace-pre-wrap text-sm text-zinc-700">
                      {testOutput}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
                      Run a test to see the output
                    </div>
                  )}
                </div>
                
                {testOutput && !testLoading && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(testOutput)}
                      className="px-3 py-1.5 text-xs bg-zinc-100 text-zinc-700 rounded hover:bg-zinc-200 transition-colors"
                    >
                      Copy Output
                    </button>
                    <button
                      onClick={() => {
                        const newPrompt = {
                          ...testPrompt,
                          name: `${testPrompt.name} (Tested)`,
                          is_default: false
                        };
                        delete (newPrompt as any).id;
                        delete (newPrompt as any).created_at;
                        delete (newPrompt as any).updated_at;
                        setFormData(newPrompt);
                        setShowTestModal(false);
                        setShowCreateModal(true);
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Save as New Prompt
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestPrompt(null);
                  setTestInput('');
                  setTestOutput('');
                }}
                className="px-4 py-2 border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prompts;