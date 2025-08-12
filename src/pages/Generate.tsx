import { useState } from 'react';
import { Sparkles, RefreshCw, Copy, Check, ChevronRight, Wand2, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateVariations } from '../lib/llm-service';

interface GeneratedVariation {
  id: string;
  provider: 'gemini' | 'claude' | 'gpt4';
  content: string;
  hook: string;
  hashtags: string[];
  readTime: number;
}

const Generate = () => {
  const [ideaText, setIdeaText] = useState('');
  const [hook, setHook] = useState('');
  const [keyPoints, setKeyPoints] = useState<string[]>(['']);
  const [targetAudience, setTargetAudience] = useState('Business professionals');
  const [contentFormat, setContentFormat] = useState('storytelling');
  const [tone, setTone] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState('');

  const clients = [
    { id: '1', name: 'Amnon Cohen - Bounce AI' },
    { id: '2', name: 'Sarah Chen - TechFlow' },
    { id: '3', name: 'Marcus Johnson - DataPro' },
  ];

  const handleAddKeyPoint = () => {
    setKeyPoints([...keyPoints, '']);
  };

  const handleKeyPointChange = (index: number, value: string) => {
    const updated = [...keyPoints];
    updated[index] = value;
    setKeyPoints(updated);
  };

  const handleRemoveKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!ideaText || !selectedClient) {
      alert('Please select a client and enter your content idea');
      return;
    }

    setGenerating(true);
    
    try {
      // Simple content idea - the system messages handle all the instructions
      const contentIdea = ideaText;
      
      // Generate variations using real LLM APIs with different prompt templates
      const results = await generateVariations(contentIdea, 6);
      
      const newVariations: GeneratedVariation[] = results.map((result, index) => {
        // Extract hashtags from the content
        const hashtagMatch = result.content.match(/#\w+/g);
        const hashtags = hashtagMatch ? hashtagMatch.map(tag => tag.substring(1)) : [];
        
        // Extract the first line as the hook
        const lines = result.content.split('\n');
        const extractedHook = lines[0] || hook || 'LinkedIn Post';
        
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
      // Fallback to mock data if API fails
      const mockVariations: GeneratedVariation[] = [
        {
          id: '1',
          provider: 'gemini',
          content: `${hook || "Here's what nobody tells you about building in public:"}\n\n${ideaText}\n\nThe key is consistency and authenticity.\n\nEvery day you show up, you build trust.\nEvery story you share, you create connection.\nEvery lesson you teach, you provide value.\n\nWhat's been your experience with building in public?\n\n#BuildInPublic #StartupLife #Entrepreneurship #ContentStrategy #LinkedInTips`,
          hook: hook || "Here's what nobody tells you about building in public:",
          hashtags: ['BuildInPublic', 'StartupLife', 'Entrepreneurship', 'ContentStrategy', 'LinkedInTips'],
          readTime: 1
        },
        {
          id: '2',
          provider: 'claude',
          content: `${hook || "I spent 100 hours researching this, so you don't have to:"}\n\n${ideaText}\n\nHere's what I learned:\n\n1. Start with the problem\n2. Validate early and often\n3. Iterate based on feedback\n4. Focus on one metric that matters\n5. Build in public for accountability\n\nThe bottom line?\nFocus on solving real problems for real people.\n\n#ProductDevelopment #StartupLessons #Innovation #TechLeadership #Growth`,
          hook: hook || "I spent 100 hours researching this, so you don't have to:",
          hashtags: ['ProductDevelopment', 'StartupLessons', 'Innovation', 'TechLeadership', 'Growth'],
          readTime: 1
        },
        {
          id: '3',
          provider: 'gpt4',
          content: `${hook || "The best advice I received this year:"}\n\n${ideaText}\n\nWhy this matters:\n\n→ It changes your perspective\n→ It drives action\n→ It creates results\n→ It builds momentum\n→ It compounds over time\n\nRemember: Execution beats perfection every time.\n\nWhat's the best advice you've received lately?\n\n#Leadership #PersonalGrowth #BusinessStrategy #Success #LinkedInCommunity`,
          hook: hook || "The best advice I received this year:",
          hashtags: ['Leadership', 'PersonalGrowth', 'BusinessStrategy', 'Success', 'LinkedInCommunity'],
          readTime: 1
        },
        {
          id: '4',
          provider: 'gemini',
          content: `${hook || "Stop waiting for the perfect moment."}\n\n${ideaText}\n\nHere's the truth:\n\nPerfect moments don't exist.\nBut perfect opportunities? They're everywhere.\n\nYou just need to:\n• Start before you're ready\n• Learn as you go\n• Adjust your course\n• Keep moving forward\n\nProgress > Perfection\n\nWhat are you waiting to start?\n\n#Motivation #GrowthMindset #CareerAdvice #Success #LinkedInLearning`,
          hook: hook || "Stop waiting for the perfect moment.",
          hashtags: ['Motivation', 'GrowthMindset', 'CareerAdvice', 'Success', 'LinkedInLearning'],
          readTime: 1
        },
        {
          id: '5',
          provider: 'claude',
          content: `${hook || "3 years ago, I made a decision that changed everything:"}\n\n${ideaText}\n\nLessons learned:\n\n1. Trust your instincts\n2. Take calculated risks\n3. Learn from failures fast\n4. Build genuine relationships\n5. Stay consistent\n\nThe result?\nNot just business growth, but personal transformation.\n\nWhat decision changed your trajectory?\n\n#CareerGrowth #Entrepreneurship #LifeLessons #ProfessionalDevelopment #Success`,
          hook: hook || "3 years ago, I made a decision that changed everything:",
          hashtags: ['CareerGrowth', 'Entrepreneurship', 'LifeLessons', 'ProfessionalDevelopment', 'Success'],
          readTime: 1
        },
        {
          id: '6',
          provider: 'gpt4',
          content: `${hook || "Most people overcomplicate success."}\n\n${ideaText}\n\nSimplicity wins:\n\n• Clear goals\n• Daily actions\n• Consistent effort\n• Regular reflection\n• Continuous improvement\n\nThat's it.\n\nNo magic formulas.\nNo secret hacks.\nJust focused execution.\n\nWhat's one thing you're overcomplicating right now?\n\n#Productivity #BusinessTips #Simplicity #SuccessMindset #LinkedInCreators`,
          hook: hook || "Most people overcomplicate success.",
          hashtags: ['Productivity', 'BusinessTips', 'Simplicity', 'SuccessMindset', 'LinkedInCreators'],
          readTime: 1
        }
      ];
      
      setVariations(mockVariations);
      setSelectedIndex(0);
    }
    
    setGenerating(false);
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSendToClient = () => {
    alert(`Sent to client for approval: ${clients.find(c => c.id === selectedClient)?.name}`);
  };

  return (
    <div className="flex-1 bg-zinc-50 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Generate Content</h1>
        <p className="text-zinc-600 mt-1">Create multiple content variations with AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Content Brief</h2>
            
            {/* Client Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">Select a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            {/* Main Idea */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Main Idea
              </label>
              <textarea
                placeholder="What's the core message or story you want to share?"
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 h-24 resize-none"
              />
            </div>

            {/* Opening Hook */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Opening Hook (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., 'Here's what nobody tells you about...'"
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            {/* Key Points */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Key Points
              </label>
              <div className="space-y-2">
                {keyPoints.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a key point"
                      value={point}
                      onChange={(e) => handleKeyPointChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    {keyPoints.length > 1 && (
                      <button
                        onClick={() => handleRemoveKeyPoint(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddKeyPoint}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-sm"
                >
                  Add Key Point
                </button>
              </div>
            </div>

            {/* Target Audience & Format */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Content Format
                </label>
                <select
                  value={contentFormat}
                  onChange={(e) => setContentFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="storytelling">Storytelling</option>
                  <option value="listicle">List/Tips</option>
                  <option value="howto">How-to Guide</option>
                  <option value="opinion">Opinion/Insight</option>
                  <option value="casestudy">Case Study</option>
                </select>
              </div>
            </div>

            {/* Tone */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="inspirational">Inspirational</option>
                <option value="educational">Educational</option>
                <option value="analytical">Analytical</option>
              </select>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !ideaText || !selectedClient}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors",
                generating || !ideaText || !selectedClient
                  ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              )}
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating 6 Variations...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Content
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          {variations.length > 0 && (
            <>
              {/* Variation Selector */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {variations.map((variation, index) => (
                  <button
                    key={variation.id}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                      selectedIndex === index
                        ? "bg-zinc-900 text-white"
                        : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    )}
                  >
                    <Wand2 className="h-3 w-3" />
                    {variation.provider.charAt(0).toUpperCase() + variation.provider.slice(1)} {Math.floor(index / 2) + 1}
                  </button>
                ))}
              </div>

              {/* Selected Variation */}
              <div className="bg-white rounded-lg border-2 border-zinc-900 overflow-hidden">
                <div className="p-4 border-b border-zinc-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900">
                      Variation {selectedIndex + 1}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-zinc-100 rounded text-xs text-zinc-700">
                        {variations[selectedIndex].provider}
                      </span>
                      <span className="px-2 py-1 bg-zinc-100 rounded text-xs text-zinc-700">
                        {variations[selectedIndex].readTime} min read
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="bg-zinc-50 rounded-lg p-4 mb-4">
                    <p className="whitespace-pre-wrap text-sm text-zinc-700">
                      {variations[selectedIndex].content}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {variations[selectedIndex].hashtags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(variations[selectedIndex].content, selectedIndex)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-sm"
                    >
                      {copiedIndex === selectedIndex ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-sm">
                      <Save className="h-4 w-4" />
                      Save Draft
                    </button>
                    <button 
                      onClick={handleSendToClient}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                      Send to Client
                    </button>
                  </div>
                </div>
              </div>

              {/* Other Variations Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-600">Other Variations</h3>
                {variations.map((variation, index) => {
                  if (index === selectedIndex) return null;
                  return (
                    <div
                      key={variation.id}
                      onClick={() => setSelectedIndex(index)}
                      className="bg-white rounded-lg border border-zinc-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="px-2 py-1 bg-zinc-100 rounded text-xs text-zinc-700">
                          {variation.provider}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {variation.readTime} min
                        </span>
                      </div>
                      <p className="text-sm text-zinc-700 line-clamp-3">
                        {variation.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {variations.length === 0 && !generating && (
            <div className="bg-white rounded-lg border-2 border-dashed border-zinc-300 p-12">
              <div className="text-center">
                <Sparkles className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500">
                  Generated content will appear here
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Select a client, enter your idea, and click generate
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Generate;