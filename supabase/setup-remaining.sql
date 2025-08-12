-- Remaining setup that might have been missed

-- Check and create triggers only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
    CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_creators_updated_at') THEN
    CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON public.creators
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add sample prompt templates if they don't exist
INSERT INTO public.prompt_templates (name, category, template_text, variables) 
SELECT * FROM (VALUES
  ('Hook - Controversial Statement', 'hook', 'Unpopular opinion: {controversial_statement}

But here''s why I believe it''s true...', '{"controversial_statement": "Your controversial take"}'::jsonb),
  ('Hook - Personal Story', 'hook', '{time_period} ago, I {past_situation}.

Today, {current_situation}.

Here''s what changed:', '{"time_period": "X years", "past_situation": "struggled with...", "current_situation": "I successfully..."}'::jsonb)
) AS v(name, category, template_text, variables)
WHERE NOT EXISTS (
  SELECT 1 FROM public.prompt_templates WHERE name = v.name
);