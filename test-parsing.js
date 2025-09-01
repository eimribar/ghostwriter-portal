// Test the parsing logic locally with known GPT-5 response format
const sampleGPT5Response = `Here are 5 bold, text-only content ideas for RevOps that turn data hygiene and AI agents into a serious competitive edge. Each post stands on its own with a strong POV, clear narrative, and practical frameworks.

1) AI agents on a messy CRM create automated chaos
Deploying agents on dirty data multiplies bad decisions at machine speed. Refuse to automate until these are in place:
- Impact taxonomy per function. Define "impact" per team and codify acronyms, thresholds, and red lines.
- Field trust scores. Tag every key field with confidence, freshness, and write permissions by role and agent.

2) Context switching kills AI accuracy more than bad prompts
Most RevOps teams prompt once and pray. Smart teams build context libraries:
- Actor-specific prompts (AE vs CSM triggers different workflows)
- Product line contexts (SaaS vs Services need different approaches)
- ICP variations (Enterprise vs SMB have different signals)

3) Your "smart" trackers are creating noise, not signals
Gong and Outreach trackers flag everything. Swift listens with business context:
- Sentiment + speaker + MRR risk = real signal
- Generic keyword matching = expensive noise
- Build custom trackers that understand YOUR business language

4) RevOps teams audit AI outputs more than they write prompts
The dirty secret: 60% of AI work is cleanup. Flip the script:
- Use GPT to audit your prompts before deploying
- Ask AI what context it needs to be accurate
- Build feedback loops that improve prompts automatically

5) Manual CRM updates died when AI agents learned to listen
Why type when AI can hear? Modern RevOps means zero-touch data entry:
- Meeting summaries become opportunity updates
- Call sentiment drives alert workflows  
- Conversation intelligence powers pipeline forecasting`;

function parseContentIdeas(responseText) {
  try {
    console.log('📝 Parsing GPT-5 response (first 500 chars):', responseText.substring(0, 500));
    
    // Split the text into sections - each idea is separated by double newlines
    let sections = responseText.split('\n\n').filter(section => section.trim() !== '');
    console.log('📝 Initial sections count:', sections.length);
    console.log('📝 First section:', sections[0]?.substring(0, 200));
    
    // Remove the intro line if it exists
    if (sections.length > 0 && sections[0].toLowerCase().includes('content idea')) {
      sections = sections.slice(1);
      console.log('📝 Removed intro, sections count:', sections.length);
    }
    
    // If still not enough ideas, try splitting by numbered patterns
    if (sections.length < 5) {
      console.log('📝 Not enough sections, trying numbered pattern split');
      // Try splitting by patterns like "1)" or "1." at the start of lines
      const numberedSections = responseText.split(/\n(?=\d+[\.)]\s)/).filter(s => s.trim());
      console.log('📝 Numbered sections count:', numberedSections.length);
      console.log('📝 First numbered section:', numberedSections[1]?.substring(0, 200));
      
      // Remove any intro text
      const startIndex = numberedSections.findIndex(s => /^\d+[\.)]\s/.test(s.trim()));
      console.log('📝 Start index of numbered content:', startIndex);
      if (startIndex >= 0) {
        sections = numberedSections.slice(startIndex);
        console.log('📝 Final sections after numbered split:', sections.length);
      }
    }
    
    // Process each idea - match n8n Code node logic exactly
    const ideas = sections.slice(0, 5).map((idea, index) => {
      console.log(`\n📝 Processing idea ${index + 1}:`, idea.substring(0, 100));
      
      // Clean up the idea text
      const cleanIdea = idea.trim()
        .replace(/^[\d\.)]+\s*/, '') // Remove leading numbers like "1)" or "1."
        .replace(/^\*\*/, '') // Remove leading bold markers
        .replace(/\*\*$/, ''); // Remove trailing bold markers
      
      console.log(`📝 Clean idea ${index + 1}:`, cleanIdea.substring(0, 100));
      
      // Extract title from first line or first 100 characters
      const lines = cleanIdea.split('\n').filter(line => line.trim());
      const title = lines[0] ? lines[0].substring(0, 100).trim() : `YouTube Content Idea ${index + 1}`;
      const description = cleanIdea;
      
      console.log(`📝 Title ${index + 1}:`, title);
      console.log(`📝 Description length ${index + 1}:`, description.length);
      
      // Extract hook (first compelling line)
      const hook = lines[0] && lines[0].length > 20 ? lines[0] : 
                   (lines[1] && lines[1].length > 20 ? lines[1] : 
                    cleanIdea.substring(0, 150) + '...');
      
      return {
        title: title,
        description: description,
        hook: hook,
        keyPoints: lines.slice(1, 4).filter(line => line.length > 10), // Extract key points from content
        targetAudience: 'RevOps professionals and B2B leaders',
        contentFormat: 'thought-leadership',
        category: 'RevOps',
        engagementScore: 8, // Default high score for curated YouTube content
        linkedInStyle: 'provocative',
        tags: ['RevOps', 'YouTube', 'Content'],
        source: 'youtube'
      };
    }).filter(idea => idea && idea.description && idea.description.length > 20); // Only include substantial ideas
    
    console.log('📝 Parsed ideas count:', ideas.length);
    console.log('📝 Ideas titles:', ideas.map(idea => idea.title));
    
    // Ensure we return at least something
    if (ideas.length === 0) {
      console.error('❌ Could not parse any content ideas');
      console.log('Raw response text:', responseText);
      return [];
    }
    
    return ideas;
    
  } catch (error) {
    console.error('❌ Error parsing content ideas:', error);
    return [];
  }
}

console.log('Testing parsing logic with sample GPT-5 response...\n');
const result = parseContentIdeas(sampleGPT5Response);
console.log('\n📊 Final result:', result.length, 'ideas parsed');
console.log('📝 First idea:', JSON.stringify(result[0], null, 2));