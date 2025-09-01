-- =====================================================
-- FINAL YOUTUBE IDEATION SETUP - NO CONFLICTS
-- Removes ON CONFLICT clauses that cause constraint errors
-- =====================================================

-- Step 1: Ensure content_ideas table supports YouTube source metadata
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS source_metadata JSONB;

-- Step 2: Delete any existing YouTube prompts first (to avoid duplicates)
DELETE FROM prompt_templates 
WHERE name IN (
  'YouTube Transcript to RevOps Ideas',
  'YouTube Video to Content Ideas (Simple)'
);

-- Step 3: Create the main RevOps YouTube transcript prompt
INSERT INTO prompt_templates (
  name,
  category,
  description,
  system_message,
  provider,
  model,
  tags,
  is_active,
  settings,
  created_at,
  updated_at
) VALUES (
  'YouTube Transcript to RevOps Ideas',
  'Content Ideation',
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

the core narrative we want to push is data hygiene and AI agents. so we need to somehow tie the content ideas to this in a thought leadership way.',
  'openai',
  'gpt-4',
  ARRAY['youtube', 'transcript', 'video', 'revops', 'ideation'],
  true,
  '{
    "temperature": 0.8,
    "max_tokens": 4000,
    "top_p": 0.95
  }'::jsonb,
  NOW(),
  NOW()
);

-- Step 4: Create a simple fallback YouTube prompt
INSERT INTO prompt_templates (
  name,
  category,
  description,
  system_message,
  provider,
  model,
  tags,
  is_active,
  settings,
  created_at,
  updated_at
) VALUES (
  'YouTube Video to Content Ideas (Simple)',
  'Content Ideation',
  'Simple prompt to generate 5 content ideas from any YouTube video transcript',
  'Based on this YouTube video transcript, generate 5 unique and engaging LinkedIn content ideas. Each idea should:

1. Be original and not copy-paste from the transcript
2. Provide a unique perspective or insight
3. Be relevant for business professionals
4. Include a clear hook or angle
5. Be suitable for LinkedIn text posts

Focus on extracting the core insights and making them your own. Avoid using the exact words or phrases from the transcript.

Format as a numbered list with each idea being 2-3 sentences long.',
  'openai',
  'gpt-4',
  ARRAY['youtube', 'transcript', 'simple', 'linkedin'],
  true,
  '{
    "temperature": 0.7,
    "max_tokens": 2000,
    "top_p": 0.9
  }'::jsonb,
  NOW(),
  NOW()
);

-- Step 5: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_content_ideas_source ON content_ideas(source);
CREATE INDEX IF NOT EXISTS idx_content_ideas_source_metadata ON content_ideas USING GIN(source_metadata);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tags ON prompt_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);

-- Step 6: Create helper function to get YouTube prompts
CREATE OR REPLACE FUNCTION get_youtube_prompts()
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  system_message TEXT,
  tags TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.name,
    pt.description,
    pt.system_message,
    pt.tags
  FROM prompt_templates pt
  WHERE pt.category = 'Content Ideation'
    AND pt.is_active = true
    AND (
      pt.tags && ARRAY['youtube'] OR
      pt.name ILIKE '%youtube%' OR
      pt.name ILIKE '%transcript%' OR
      pt.name ILIKE '%video%'
    )
  ORDER BY 
    CASE WHEN pt.tags && ARRAY['youtube'] THEN 1 ELSE 2 END,
    pt.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_youtube_prompts TO anon, authenticated;

-- Step 7: Test function to verify setup
CREATE OR REPLACE FUNCTION test_youtube_setup()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  youtube_prompt_count INTEGER;
  content_ideas_has_metadata BOOLEAN;
BEGIN
  -- Check YouTube prompts
  SELECT COUNT(*) INTO youtube_prompt_count
  FROM prompt_templates
  WHERE category = 'Content Ideation' 
    AND is_active = true 
    AND tags && ARRAY['youtube'];
  
  -- Check content_ideas table structure
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_ideas' AND column_name = 'source_metadata'
  ) INTO content_ideas_has_metadata;
  
  -- Return test results
  RETURN QUERY VALUES 
    ('YouTube Prompts', 
     CASE WHEN youtube_prompt_count > 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
     youtube_prompt_count::TEXT || ' YouTube prompts found'),
    ('Content Ideas Schema', 
     CASE WHEN content_ideas_has_metadata THEN '✅ PASS' ELSE '❌ FAIL' END,
     CASE WHEN content_ideas_has_metadata THEN 'source_metadata column exists' ELSE 'source_metadata column missing' END),
    ('API Endpoint',
     '⚠️ MANUAL',
     'Test /api/youtube-ideation endpoint manually'),
    ('Environment Variables',
     '⚠️ MANUAL', 
     'Add APIFY_API_KEY to Vercel environment variables');
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_youtube_setup TO anon, authenticated;

-- Step 8: Success message and verification
DO $$
DECLARE
  youtube_prompt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO youtube_prompt_count
  FROM prompt_templates
  WHERE category = 'Content Ideation' 
    AND is_active = true 
    AND tags && ARRAY['youtube'];

  RAISE NOTICE '🎬 YOUTUBE IDEATION SETUP COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ YouTube prompts created: %', youtube_prompt_count;
  RAISE NOTICE '✅ Database schema updated with source_metadata column';
  RAISE NOTICE '✅ Performance indexes created';
  RAISE NOTICE '✅ Helper functions available';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 NEXT STEPS:';
  RAISE NOTICE '1. Add APIFY_API_KEY to Vercel environment variables';
  RAISE NOTICE '2. Get key from: https://console.apify.com/account/integrations';
  RAISE NOTICE '3. Deploy updated code to Vercel (already done)';
  RAISE NOTICE '4. Test with YouTube URL in Ideation page';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 VERIFY SETUP NOW:';
  RAISE NOTICE 'Run: SELECT * FROM test_youtube_setup();';
  RAISE NOTICE 'Run: SELECT * FROM get_youtube_prompts();';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 READY TO GENERATE IDEAS FROM YOUTUBE VIDEOS!';
END $$;

-- Step 9: Run verification immediately
SELECT * FROM test_youtube_setup();

-- Step 10: Show created prompts
SELECT name, category, array_length(tags, 1) as tag_count, is_active 
FROM prompt_templates 
WHERE tags && ARRAY['youtube'] 
ORDER BY created_at DESC;