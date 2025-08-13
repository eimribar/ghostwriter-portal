import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Copy, Check, ChevronRight, Wand2, CheckCircle, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateLinkedInVariations } from '../lib/llm-service';
import { generatedContentService, contentIdeasService, clientsService, type Client } from '../services/database.service';
import { useAuth } from '../contexts/AuthContext';

interface GeneratedVariation {
  id: string;
  provider: 'gemini' | 'claude' | 'gpt4';
  content: string;
  hook: string;
  hashtags: string[];
  readTime: number;
}

const Generate = () => {
  const { user } = useAuth();
  const [contentIdea, setContentIdea] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savedToDb, setSavedToDb] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clientsList = await clientsService.getAll();
      setClients(clientsList.filter(c => c.status === 'active'));
      setLoadingClients(false);
    } catch (error) {
      console.error('Error loading clients:', error);
      setLoadingClients(false);
    }
  };

  const handleGenerate = async () => {
    if (!contentIdea.trim()) {
      alert('Please enter a content idea');
      return;
    }

    console.log('Starting generation for:', contentIdea);
    console.log('API Key configured:', !!import.meta.env.VITE_GOOGLE_API_KEY);
    console.log('API Key first 10 chars:', import.meta.env.VITE_GOOGLE_API_KEY?.substring(0, 10));
    console.log('All env vars:', Object.keys(import.meta.env));

    setGenerating(true);
    
    try {
      // Generate variations using real LLM APIs with different LinkedIn prompt templates
      const results = await generateLinkedInVariations(contentIdea, 4);
      
      const newVariations: GeneratedVariation[] = results.map((result, index) => {
        // Extract hashtags from the content
        const hashtagMatch = result.content.match(/#\w+/g);
        const hashtags = hashtagMatch ? hashtagMatch.map(tag => tag.substring(1)) : [];
        
        // Extract the first line as the hook
        const lines = result.content.split('\n');
        const extractedHook = lines[0] || 'LinkedIn Post';
        
        return {
          id: String(index + 1),
          provider: result.provider as 'gemini' | 'claude' | 'gpt4',
          content: result.content,
          hook: extractedHook,
          hashtags,
          readTime: Math.ceil(result.content.split(' ').length / 200)
        };
      });
      
      setVariations(newVariations);
      setSelectedIndex(0);
      
      // Auto-save to database
      await saveToDatabase(newVariations);
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate content. Please try again.');
    }
    
    setGenerating(false);
  };

  const saveToDatabase = async (variationsToSave: GeneratedVariation[]) => {
    setSaving(true);
    setSavedToDb(false);
    
    try {
      // Skip content_idea creation - go straight to saving generated content
      // This avoids any issues with the content_ideas table
      
      // Save each variation as generated content directly
      const savePromises = variationsToSave.map(async (variation, index) => {
        return generatedContentService.create({
          idea_id: undefined, // No idea needed
          client_id: undefined, // No client needed
          ghostwriter_id: user?.id || undefined,
          variant_number: index + 1,
          content_text: variation.content,
          hook: variation.hook,
          hashtags: variation.hashtags,
          estimated_read_time: variation.readTime,
          llm_provider: 'google', // Using Gemini
          llm_model: 'gemini-2.5-pro',
          generation_prompt: contentIdea,
          status: 'draft', // Start as draft for admin review
        });
      });
      
      const savedResults = await Promise.all(savePromises);
      console.log('Save results:', savedResults);
      const successCount = savedResults.filter(r => r !== null).length;
      
      if (successCount > 0) {
        setSavedToDb(true);
        console.log(`Saved ${successCount} variations to database`);
        console.log('Saved content IDs:', savedResults.filter(r => r !== null).map(r => r.id));
      } else {
        console.error('No variations were saved successfully');
        alert('Failed to save content variations. Please check your database connection.');
      }
    } catch (error) {
      console.error('Error saving to database:', error);
      alert(`Error saving to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRegenerate = () => {
    if (contentIdea) {
      handleGenerate();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Generate Content</h1>
        <p className="text-zinc-600 mt-2">
          Enter your content idea and generate 4 unique LinkedIn post variations
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Input */}
        <div>
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Wand2 className="w-5 h-5 text-zinc-700" />
              <h2 className="text-lg font-semibold text-zinc-900">Content Generation</h2>
            </div>

            {/* Client Selection - OPTIONAL (hidden for now) */}
            {false && (
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                  <Users className="w-4 h-4" />
                  Select Client (Optional)
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  disabled={loadingClients}
                >
                  <option value="">No client selected...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.company}
                    </option>
                  ))}
                </select>
                {selectedClient && (
                  <p className="text-xs text-zinc-500 mt-2">
                    Generating content for: {clients.find(c => c.id === selectedClient)?.name}
                  </p>
                )}
              </div>
            )}

            {/* Content Idea Input */}
            <div className="mb-6">
              <label className="text-sm font-medium text-zinc-700 mb-2 block">
                Content Idea
              </label>
              <textarea
                placeholder="Enter your content idea... (e.g., 'How AI is transforming customer service' or 'The importance of work-life balance in startups')"
                value={contentIdea}
                onChange={(e) => setContentIdea(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
              <p className="text-sm text-zinc-500 mt-2">
                Just describe what you want to write about. Our AI will create 4 different variations using various LinkedIn writing styles.
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !contentIdea.trim()}
              className={cn(
                "w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2",
                generating || !contentIdea.trim()
                  ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              )}
            >
              {generating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating 4 Variations...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Variations
                </>
              )}
            </button>
          </div>

          {/* Save Status Indicator */}
          {(saving || savedToDb) && (
            <div className={cn(
              "mt-4 p-3 rounded-lg flex items-center gap-2",
              savedToDb ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
            )}>
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving to database...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Saved! Content sent to approval queue.
                </>
              )}
            </div>
          )}

          {/* Regenerate Button */}
          {variations.length > 0 && (
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="mt-4 w-full px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate All Variations
            </button>
          )}
        </div>

        {/* Right Column - Generated Variations */}
        <div>
          {variations.length > 0 ? (
            <div className="space-y-4">
              {/* Variation Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {variations.map((variation, index) => (
                  <button
                    key={variation.id}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors",
                      selectedIndex === index
                        ? "bg-zinc-900 text-white"
                        : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    Variation {index + 1}
                  </button>
                ))}
              </div>

              {/* Selected Variation */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-900">
                        Variation {selectedIndex + 1}
                      </span>
                      <span className="text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded">
                        ~{variations[selectedIndex].readTime} min read
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">
                      Generated with {variations[selectedIndex].provider}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(variations[selectedIndex].content, selectedIndex)}
                    className="p-2 hover:bg-zinc-50 rounded-lg transition-colors"
                  >
                    {copiedIndex === selectedIndex ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-600" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="prose prose-zinc max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-zinc-700 leading-relaxed">
                    {variations[selectedIndex].content}
                  </div>
                </div>

                {/* Hashtags */}
                {variations[selectedIndex].hashtags.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-100">
                    <div className="flex flex-wrap gap-2">
                      {variations[selectedIndex].hashtags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                  disabled={selectedIndex === 0}
                  className={cn(
                    "px-4 py-2 rounded-lg flex items-center gap-2 transition-colors",
                    selectedIndex === 0
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                      : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Previous
                </button>
                <span className="text-sm text-zinc-500">
                  {selectedIndex + 1} of {variations.length}
                </span>
                <button
                  onClick={() => setSelectedIndex(Math.min(variations.length - 1, selectedIndex + 1))}
                  disabled={selectedIndex === variations.length - 1}
                  className={cn(
                    "px-4 py-2 rounded-lg flex items-center gap-2 transition-colors",
                    selectedIndex === variations.length - 1
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                      : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-12 text-center">
              <Sparkles className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-900 mb-2">
                No Content Generated Yet
              </h3>
              <p className="text-zinc-600">
                Enter a content idea and click "Generate Variations" to create 4 unique LinkedIn posts
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Generate;