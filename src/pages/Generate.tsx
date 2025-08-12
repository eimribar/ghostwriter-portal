import { useState } from 'react';
import { Sparkles, RefreshCw, Copy, Check, ChevronRight, Wand2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateLinkedInVariations } from '../lib/llm-service';

interface GeneratedVariation {
  id: string;
  provider: 'gemini' | 'claude' | 'gpt4';
  content: string;
  hook: string;
  hashtags: string[];
  readTime: number;
}

const Generate = () => {
  const [contentIdea, setContentIdea] = useState('');
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!contentIdea.trim()) {
      alert('Please enter a content idea');
      return;
    }

    console.log('Starting generation for:', contentIdea);
    console.log('API Key configured:', !!import.meta.env.VITE_GOOGLE_API_KEY);

    setGenerating(true);
    
    try {
      // Generate variations using real LLM APIs with different LinkedIn prompt templates
      const results = await generateLinkedInVariations(contentIdea, 6);
      
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
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate content. Please try again.');
    }
    
    setGenerating(false);
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
          Enter your content idea and generate 6 unique LinkedIn post variations
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Input */}
        <div>
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Wand2 className="w-5 h-5 text-zinc-700" />
              <h2 className="text-lg font-semibold text-zinc-900">Content Idea</h2>
            </div>

            {/* Content Idea Input */}
            <div className="mb-6">
              <textarea
                placeholder="Enter your content idea... (e.g., 'How AI is transforming customer service' or 'The importance of work-life balance in startups')"
                value={contentIdea}
                onChange={(e) => setContentIdea(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
              <p className="text-sm text-zinc-500 mt-2">
                Just describe what you want to write about. Our AI will create 6 different variations using various LinkedIn writing styles.
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
                  Generating 6 Variations...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Variations
                </>
              )}
            </button>
          </div>

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
                Enter a content idea and click "Generate Variations" to create 6 unique LinkedIn posts
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Generate;