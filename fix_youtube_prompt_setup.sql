-- =====================================================
-- FIX YOUTUBE PROMPT SETUP - Correct Column Names
-- Run this if the original setup script failed
-- =====================================================

-- Step 1: Check the actual structure of prompt_templates
DO $$
DECLARE
    col_info RECORD;
BEGIN
    RAISE NOTICE '📋 PROMPT_TEMPLATES TABLE STRUCTURE:';
    RAISE NOTICE '=====================================';
    
    FOR col_info IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'prompt_templates' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  % (%)', col_info.column_name, col_info.data_type;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- Step 2: Add source_metadata column to content_ideas if missing
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS source_metadata JSONB;

-- Step 3: Create YouTube prompt using correct column names
-- First, let's see if the table uses 'content' instead of 'prompt_text'
INSERT INTO prompt_templates (
  name,
  description,
  content,  -- Changed from prompt_text to content
  category,
  provider,
  is_active,
  tags,
  created_at,
  updated_at
) VALUES (
  'YouTube Transcript to RevOps Ideas',
  'Generate 5 highly engaging RevOps content ideas from YouTube transcripts with unique insights and strong POV',
  'based on this transcript. generate 5 highly engaging content ideas (all text posts) with unique insights, POVs and super strong POV and narrative. Another thing to mention is that we should not blindly copy-paste ideas from it; we should get inspired, gain unique points of view and insights, and make them our own.

We are writing for RevOps as our core audience, so we want to get unique insights, points of view, thoughts, and stuff like that from this YouTube. And then make them our own. That''s kind of like the main idea - not bluntly copy-pasting. Think about it - the people from the podcast might see the actual post that we''re creating. They should not feel or get the feeling like this is a copy-paste from what they were saying. Like this is an exact replica or it''s way too similar to what they were saying.

So we need to take inspiration, ideas, points of view, and make them our own. 

make the content ideas VERY bold, provocative and thought provoking.

## DISALLOWED Terms and Phrases:

Stories
"asked me"
"Last week/month/year"
" yesterday"
"I saw"
"I heard"
"Told me"
"I was"
"I"
"This isn''t"
"stop"
"Start"
"Fire/firing/layoff" (never use this narrative)
"They aren''t just"
"They don''t just"
"It isn''t"
"The real shift"
"This is about"
"This isn''t"
"it''s not"
Em-dashes (—)
"fluff"
"Here''s the kicker."
"void"
"It''s not about [one thing]. It''s about [a different thing.]"
"Here''s the truth"
"Let''s be honest"
"deep dive"
"Join us"
"embark"
"tapestry"
"operational efficiency"
"Let me explain"
"Honestly?"
"beacon"
"furthermore"
"nevertheless"
"nonetheless"
"notwithstanding"
"transformation"
"transformative"
"revolutionize"
"embrace"
"illuminate"
"crickets"
"here''s the thing"
"authentic"
"vanity metrics"
"pitch-slapped"
"through the noise"
"superpower(s)"
"strike gold"
"secret weapon, weapons, arsenal"
"harness"
"thrive"
"skyrocket"
"soar"
"game-changer"
"forget"
"evolve"
"unlock"
"unleash"
"elevate"
"Delve"

the core narrative we want to push is data hygiene and AI agents. so we need to somehow tie the content ideas to this in a thought leadership way.

Transcript: "{INSERT TRANSCRIPT}"',
  'Content Ideation',
  'openai',
  true,
  ARRAY['youtube', 'transcript', 'video', 'revops', 'ideation'],
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Step 4: Try alternative column names if 'content' fails
-- This will catch the error and try other common column names
DO $$
BEGIN
    -- Try with 'template' column name
    INSERT INTO prompt_templates (
      name,
      description,
      template,
      category,
      provider,
      is_active,
      tags,
      created_at,
      updated_at
    ) VALUES (
      'YouTube Transcript to RevOps Ideas (Alt)',
      'Generate 5 highly engaging RevOps content ideas from YouTube transcripts',
      'based on this transcript. generate 5 highly engaging content ideas... Transcript: "{INSERT TRANSCRIPT}"',
      'Content Ideation',
      'openai',
      true,
      ARRAY['youtube', 'transcript', 'video', 'revops'],
      NOW(),
      NOW()
    ) ON CONFLICT (name) DO NOTHING;
    
    RAISE NOTICE '✅ Prompt created with template column';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not create prompt with template column: %', SQLERRM;
END $$;

-- Step 5: Create a simple fallback YouTube prompt
INSERT INTO prompt_templates (
  name,
  description,
  content,
  category,
  provider,
  is_active,
  tags
) VALUES (
  'YouTube Video to Content Ideas (Simple)',
  'Simple prompt to generate 5 content ideas from any YouTube video transcript',
  'Based on this YouTube video transcript, generate 5 unique and engaging LinkedIn content ideas. Each idea should be original, provide unique perspective, be relevant for business professionals, include clear hook, and be suitable for LinkedIn text posts. Focus on extracting core insights and making them your own. Avoid exact words from transcript. Format as numbered list with each idea 2-3 sentences. Transcript: "{INSERT TRANSCRIPT}"',
  'Content Ideation',
  'openai',
  true,
  ARRAY['youtube', 'transcript', 'simple', 'linkedin']
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_content_ideas_source ON content_ideas(source);
CREATE INDEX IF NOT EXISTS idx_content_ideas_source_metadata ON content_ideas USING GIN(source_metadata);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tags ON prompt_templates USING GIN(tags);

-- Step 7: Test the setup
SELECT 
  'YouTube Prompts Created' as status,
  COUNT(*) as count
FROM prompt_templates 
WHERE tags && ARRAY['youtube'] AND is_active = true;

SELECT 
  'Content Ideas Table Ready' as status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_ideas' AND column_name = 'source_metadata'
  ) THEN 'YES' ELSE 'NO' END as has_metadata_column;

-- Step 8: Show available YouTube prompts
SELECT 
  name,
  description,
  CASE 
    WHEN content IS NOT NULL THEN 'content'
    WHEN template IS NOT NULL THEN 'template'  
    WHEN prompt_text IS NOT NULL THEN 'prompt_text'
    ELSE 'unknown'
  END as prompt_column
FROM prompt_templates 
WHERE tags && ARRAY['youtube'] AND is_active = true;

RAISE NOTICE '🎬 YouTube ideation setup complete!';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Add APIFY_API_KEY to Vercel environment variables';
RAISE NOTICE '2. Test the /api/youtube-ideation endpoint';