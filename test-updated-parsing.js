// Test the updated parsing logic with the actual GPT-5 response
const actualGPT5Response = `Here are 5 bold text-post concepts tailored for RevOps, anchored on data hygiene and AI agents. Each one takes inspiration from the themes in the transcript but pushes a distinct POV and narrative.

1) Title: Dirty CRM, Confident AI
Thesis: AI agents do not just amplify productivity. They amplify whatever they touch. A messy CRM turns an agent into a fast, confident liar.
Core points:
- No prompt compensates for contaminated facts. The fastest path to better AI output is a ruthless data hygiene program.
- Adopt a "truth hierarchy." Define which objects and fields are canonical, which are advisory, and which are quarantined.
- Require provenance. Every agent write-back must include source, timestamp, and confidence, or it gets discarded.
- Create expiring facts. Certain fields decay over time. If an agent cannot reconfirm from approved sources, it cannot propagate them.

2) Title: Hallucinations Are a Feature
Thesis: Treat hallucinations as telemetry. They reveal missing definitions, weak taxonomies, and broken pipelines.
Core points:
- Build a hallucination heatmap. Tag false outputs by field, object, team, and source. Pattern recognition starts within a week.
- Install a contradiction check. Ask agents to explain reasoning and cite sources. Contradictions point to upstream misalignment.
- Use misfires to prioritize hygiene. The agent fails where the business lacks definitions. Fix the definition, then fix the data.

3) Title: Prompt Engineering Is Overrated. Context Engineering Wins RevOps.
Thesis: Access to the right context beats clever phrasing. Build a context supply chain, not a clever prompt library.
Core points:
- Create a Context Contract. Every agent call receives role, business definitions, KPIs, taxonomies, and allowed sources.
- Move from prompts to templates. Keep prompts simple. Pipe in context via variables, not prose.
- Build a Context Registry. Centralize definitions of "impact," lifecycle stages, ICPs, objections, and approval rules.

4) Title: Lean Models, Clean Data, Lower Bills
Thesis: The spend should follow the hygiene. Cleaner data and tighter context allow leaner models to deliver enterprise-grade results.
Core points:
- Budget reallocation: 70 percent to data quality, context orchestration, and guardrails. 30 percent to model spend.
- Right-size the model to the task. Reasoning for pattern discovery, general models for summarization, retrieval for facts.
- Enforce structured outputs. JSON schemas, controlled vocabularies, and taxonomies keep results deterministically useful.

5) Title: Agents Should Earn Write Access
Thesis: Treat your CRM like a zero-trust system. Agents climb a trust ladder, not a shortcut to full edit rights.
Core points:
- Progressive trust: Read only → Propose changes with evidence → Co-edit with approval → Auto-write with audit trail
- Every suggested change must include source links, confidence, business impact, and a rollback plan.
- Tie write access to definitions of impact. If the agent cannot map a change to agreed revenue logic, it cannot write.`;

function parseContentIdeas(responseText) {
  try {
    console.log('📝 Parsing GPT-5 response (first 500 chars):', responseText.substring(0, 500));
    
    // Handle the specific GPT-5 response format with "Title:" and "Thesis:" structure
    let sections = [];
    
    // Try splitting by numbered patterns first (like "1) Title:", "2) Title:", etc.)
    if (responseText.includes('Title:')) {
      console.log('📝 Detected Title: format, using numbered Title pattern');
      const numberedTitleSections = responseText.split(/(?=\d+\)\s*Title:)/).filter(s => s.trim());
      console.log('📝 Numbered title sections found:', numberedTitleSections.length);
      
      // Remove intro text (anything before first numbered title)
      const startIndex = numberedTitleSections.findIndex(s => /^\d+\)\s*Title:/.test(s.trim()));
      if (startIndex >= 0) {
        sections = numberedTitleSections.slice(startIndex);
        console.log('📝 Using title-based sections:', sections.length);
      }
    }
    
    // Fallback to double newline separation
    if (sections.length === 0) {
      console.log('📝 Falling back to double newline split');
      sections = responseText.split('\n\n').filter(section => section.trim() !== '');
      console.log('📝 Double newline sections:', sections.length);
      
      // Remove intro if it exists
      if (sections.length > 0 && (sections[0].toLowerCase().includes('content idea') || sections[0].length < 100)) {
        sections = sections.slice(1);
        console.log('📝 Removed intro, sections count:', sections.length);
      }
    }
    
    // Final fallback: try basic numbered pattern
    if (sections.length < 3) {
      console.log('📝 Final fallback: basic numbered pattern');
      const numberedSections = responseText.split(/\n(?=\d+[\.)]\s)/).filter(s => s.trim());
      const startIndex = numberedSections.findIndex(s => /^\d+[\.)]\s/.test(s.trim()));
      if (startIndex >= 0) {
        sections = numberedSections.slice(startIndex);
      }
    }
    
    console.log('📝 Final sections to process:', sections.length);
    if (sections.length > 0) {
      console.log('📝 First section preview:', sections[0]?.substring(0, 150));
    }
    
    // Process each idea - handle the Title/Thesis format from GPT-5
    const ideas = sections.slice(0, 5).map((idea, index) => {
      console.log(`\n📝 Processing idea ${index + 1}:`, idea.substring(0, 100));
      
      // Clean up the idea text
      let cleanIdea = idea.trim()
        .replace(/^[\d\.)]+\s*/, ''); // Remove leading numbers like "1)" or "1."
      
      console.log(`📝 Clean idea ${index + 1}:`, cleanIdea.substring(0, 100));
      
      // Extract title and content based on the GPT-5 format
      let title = `YouTube Content Idea ${index + 1}`;
      let description = cleanIdea;
      let hook = '';
      
      // Check if this is the Title/Thesis format
      const titleMatch = cleanIdea.match(/Title:\s*(.+?)(?=\n|$)/);
      const thesisMatch = cleanIdea.match(/Thesis:\s*(.+?)(?=\n|$)/);
      
      if (titleMatch) {
        title = titleMatch[1].trim();
        console.log(`📝 Extracted title ${index + 1}:`, title);
      }
      
      if (thesisMatch) {
        hook = thesisMatch[1].trim();
        console.log(`📝 Extracted thesis ${index + 1}:`, hook.substring(0, 100));
      }
      
      // If no specific format, use first line as title
      if (!titleMatch) {
        const lines = cleanIdea.split('\n').filter(line => line.trim());
        if (lines[0]) {
          title = lines[0].substring(0, 100).trim();
        }
      }
      
      // If no thesis, use first compelling line as hook
      if (!hook) {
        const lines = cleanIdea.split('\n').filter(line => line.trim());
        hook = lines.find(line => line.length > 20 && !line.includes('Title:')) || 
               cleanIdea.substring(0, 150) + '...';
      }
      
      console.log(`📝 Final title ${index + 1}:`, title);
      console.log(`📝 Final hook ${index + 1}:`, hook.substring(0, 100));
      console.log(`📝 Description length ${index + 1}:`, description.length);
      
      // Extract key points from Core points section or bullet points
      const lines = cleanIdea.split('\n').filter(line => line.trim());
      const keyPoints = lines.filter(line => 
        line.trim().startsWith('-') || 
        line.trim().startsWith('•') ||
        (line.includes(':') && line.length < 200)
      ).slice(0, 4);
      
      return {
        title: title,
        description: description,
        hook: hook,
        keyPoints: keyPoints.length > 0 ? keyPoints : lines.slice(1, 4).filter(line => line.length > 10),
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

console.log('Testing UPDATED parsing logic with actual GPT-5 response...\n');
const result = parseContentIdeas(actualGPT5Response);
console.log('\n📊 Final result:', result.length, 'ideas parsed');
if (result.length > 0) {
  console.log('\n📝 First parsed idea:');
  console.log('Title:', result[0].title);
  console.log('Hook:', result[0].hook.substring(0, 200));
  console.log('Key points:', result[0].keyPoints.slice(0, 2));
  console.log('Description length:', result[0].description.length);
}