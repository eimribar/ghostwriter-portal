-- Cleanup script to remove system messages that slipped through
-- Run this in Supabase SQL editor to clean up the database

-- Delete all ideas that are obviously system messages
DELETE FROM content_ideas
WHERE 
  -- Title contains system message patterns
  title LIKE '%has joined the channel%'
  OR title LIKE '%has left the channel%'
  OR title LIKE '%has renamed the channel%'
  OR title LIKE '%was added to%'
  OR title LIKE '%was removed from%'
  OR title LIKE '%set the channel%'
  OR title LIKE '%archived the channel%'
  OR title LIKE '%created the channel%'
  
  -- Or description contains these patterns
  OR description LIKE '%has joined the channel%'
  OR description LIKE '%has left the channel%'
  OR description LIKE '%has renamed the channel%'
  OR description LIKE '%<@U%>%has joined%'
  OR description LIKE '%<@U%>%has left%'
  
  -- Or title is just a user ID pattern
  OR title ~ '^<@U[A-Z0-9]+>$'
  OR title ~ '^@U[A-Z0-9]+$'
  
  -- Or title/description is suspiciously short and from Slack
  OR (source = 'slack' AND LENGTH(title) < 20)
  OR (source = 'slack' AND title ~ '^<@.*>$');

-- Count how many were deleted
SELECT COUNT(*) as deleted_count FROM content_ideas 
WHERE title LIKE '%has joined%' OR title LIKE '%has renamed%';

-- Show remaining Slack ideas to verify cleanup
SELECT id, title, slack_user_name, created_at 
FROM content_ideas 
WHERE source = 'slack'
ORDER BY created_at DESC
LIMIT 20;