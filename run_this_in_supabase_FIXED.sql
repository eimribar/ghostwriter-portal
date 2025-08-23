-- =====================================================
-- RUN THIS IN SUPABASE SQL EDITOR (FIXED VERSION)
-- Creates notification system for client actions
-- =====================================================

-- Step 1: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('approved', 'rejected', 'edited', 'batch_approved')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create client activity log table
CREATE TABLE IF NOT EXISTS client_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
  action TEXT CHECK (action IN ('viewed', 'approved', 'rejected', 'edited')),
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_client_id ON client_activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON client_activity_log(created_at DESC);

-- Step 4: Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activity_log ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
DROP POLICY IF EXISTS "Allow all for anon" ON notifications;
CREATE POLICY "Allow all for anon" ON notifications
FOR ALL TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON notifications;
CREATE POLICY "Allow all for authenticated" ON notifications
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON client_activity_log;
CREATE POLICY "Allow all for anon" ON client_activity_log
FOR ALL TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON client_activity_log;
CREATE POLICY "Allow all for authenticated" ON client_activity_log
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Step 6: Create function to automatically create notifications on status change
CREATE OR REPLACE FUNCTION create_notification_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  client_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Only trigger for client status changes
  IF NEW.status IN ('client_approved', 'client_rejected', 'client_edited') AND 
     OLD.status != NEW.status THEN
    
    -- Get client name
    SELECT name INTO client_name 
    FROM clients 
    WHERE id = NEW.client_id;
    
    -- Determine notification type and message
    CASE NEW.status
      WHEN 'client_approved' THEN
        notification_type := 'approved';
        notification_title := COALESCE(client_name, 'Client') || ' approved content';
        notification_message := 'Content variant #' || NEW.variant_number || ' has been approved';
      WHEN 'client_rejected' THEN
        notification_type := 'rejected';
        notification_title := COALESCE(client_name, 'Client') || ' rejected content';
        notification_message := 'Content variant #' || NEW.variant_number || ' was rejected. ' || 
                                COALESCE('Reason: ' || NEW.revision_notes, 'No reason provided');
      WHEN 'client_edited' THEN
        notification_type := 'edited';
        notification_title := COALESCE(client_name, 'Client') || ' edited content';
        notification_message := 'Content variant #' || NEW.variant_number || ' has been edited and needs review';
    END CASE;
    
    -- Create notification (without user_id for now)
    INSERT INTO notifications (
      client_id,
      content_id,
      type,
      title,
      message,
      metadata
    ) VALUES (
      NEW.client_id,
      NEW.id,
      notification_type,
      notification_title,
      notification_message,
      jsonb_build_object(
        'variant_number', NEW.variant_number,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'client_name', client_name
      )
    );
    
    -- Log activity
    INSERT INTO client_activity_log (
      client_id,
      content_id,
      action,
      previous_status,
      new_status,
      notes
    ) VALUES (
      NEW.client_id,
      NEW.id,
      CASE 
        WHEN NEW.status = 'client_approved' THEN 'approved'
        WHEN NEW.status = 'client_rejected' THEN 'rejected'
        WHEN NEW.status = 'client_edited' THEN 'edited'
      END,
      OLD.status,
      NEW.status,
      NEW.revision_notes
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for automatic notifications
DROP TRIGGER IF EXISTS trigger_create_notification_on_status_change ON generated_content;

CREATE TRIGGER trigger_create_notification_on_status_change
AFTER UPDATE ON generated_content
FOR EACH ROW
EXECUTE FUNCTION create_notification_on_status_change();

-- Success message
SELECT 
  '✅ Notification system created successfully!' as message,
  'Automatic notifications will be created when clients approve/reject/edit content' as details;