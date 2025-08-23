-- =====================================================
-- FIX NOTIFICATIONS TRIGGER
-- Remove or fix the trigger that's causing errors
-- =====================================================

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_notification_on_status_change ON generated_content;

-- Drop the function too
DROP FUNCTION IF EXISTS create_notification_on_status_change();

-- For now, we'll disable automatic notifications to fix the immediate issue
-- You can re-enable them later with a proper implementation

-- Success message
SELECT 
  '✅ Notifications trigger removed!' as message,
  'Client actions will now work without errors' as details;