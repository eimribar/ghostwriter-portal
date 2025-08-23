-- =====================================================
-- MULTI-USER SYSTEM DATABASE MIGRATION (FIXED VERSION)
-- Phase 1: Database Architecture Enhancement
-- =====================================================

-- Step 1: Enhance clients table with user association and portal access
DO $$
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added user_id column to clients table';
    END IF;
    
    -- Add portal_access column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'portal_access'
    ) THEN
        ALTER TABLE clients ADD COLUMN portal_access BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added portal_access column to clients table';
    END IF;
    
    -- Add mobile_pin column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'mobile_pin'
    ) THEN
        ALTER TABLE clients ADD COLUMN mobile_pin TEXT;
        RAISE NOTICE 'Added mobile_pin column to clients table';
    END IF;
END $$;

-- Step 2: Create user_prompt_overrides table for personalized prompts
CREATE TABLE IF NOT EXISTS user_prompt_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    base_prompt_id UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
    customized_system_message TEXT NOT NULL,
    customized_settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one override per client per base prompt
    UNIQUE(client_id, base_prompt_id)
);

-- Step 3: Create admin_sessions table for user switching
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    switched_at TIMESTAMPTZ DEFAULT NOW(),
    session_data JSONB DEFAULT '{}',
    
    -- Index for fast lookups
    UNIQUE(admin_user_id)
);

-- Step 4: Enhance generated_content table with prompt override tracking
DO $$
BEGIN
    -- Add prompt_override_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'generated_content' AND column_name = 'prompt_override_id'
    ) THEN
        ALTER TABLE generated_content ADD COLUMN prompt_override_id UUID REFERENCES user_prompt_overrides(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added prompt_override_id column to generated_content table';
    END IF;
    
    -- Add base_prompt_id for tracking which template was used
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'generated_content' AND column_name = 'base_prompt_id'
    ) THEN
        ALTER TABLE generated_content ADD COLUMN base_prompt_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added base_prompt_id column to generated_content table';
    END IF;
END $$;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_prompt_overrides_client_id ON user_prompt_overrides(client_id);
CREATE INDEX IF NOT EXISTS idx_user_prompt_overrides_base_prompt_id ON user_prompt_overrides(base_prompt_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_prompt_override_id ON generated_content(prompt_override_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Step 6: Create RLS policies for multi-tenant security
ALTER TABLE user_prompt_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own prompt overrides" ON user_prompt_overrides;
DROP POLICY IF EXISTS "Admins can manage all prompt overrides" ON user_prompt_overrides;
DROP POLICY IF EXISTS "Users can manage their own admin sessions" ON admin_sessions;

-- Policy: Users can only see their own prompt overrides
CREATE POLICY "Users can view their own prompt overrides" ON user_prompt_overrides
    FOR ALL USING (
        client_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
        )
    );

-- Policy: Admins can manage all prompt overrides
CREATE POLICY "Admins can manage all prompt overrides" ON user_prompt_overrides
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ghostwriter')
        )
    );

-- Policy: Users can only see their own admin sessions
CREATE POLICY "Users can manage their own admin sessions" ON admin_sessions
    FOR ALL USING (admin_user_id = auth.uid());

-- Step 7: Create helpful views
CREATE OR REPLACE VIEW client_prompt_overview AS
SELECT 
    c.id as client_id,
    c.name as client_name,
    c.company,
    pt.id as prompt_id,
    pt.name as prompt_name,
    pt.category,
    CASE 
        WHEN upo.id IS NOT NULL THEN 'customized'
        ELSE 'default'
    END as prompt_status,
    upo.id as override_id,
    upo.updated_at as last_customized
FROM clients c
CROSS JOIN prompt_templates pt
LEFT JOIN user_prompt_overrides upo ON c.id = upo.client_id AND pt.id = upo.base_prompt_id
WHERE c.portal_access = true
    AND pt.is_active = true
ORDER BY c.name, pt.category, pt.name;

-- Step 8: Create functions for common operations
CREATE OR REPLACE FUNCTION get_client_prompt(
    p_client_id UUID,
    p_prompt_id UUID
) RETURNS TABLE (
    prompt_id UUID,
    system_message TEXT,
    settings JSONB,
    is_customized BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.id,
        COALESCE(upo.customized_system_message, pt.system_message) as system_message,
        COALESCE(upo.customized_settings, pt.settings) as settings,
        (upo.id IS NOT NULL) as is_customized
    FROM prompt_templates pt
    LEFT JOIN user_prompt_overrides upo ON pt.id = upo.base_prompt_id 
        AND upo.client_id = p_client_id 
        AND upo.is_active = true
    WHERE pt.id = p_prompt_id 
        AND pt.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Insert demo data for Jonathan (CEO) - FIXED VERSION
DO $$
DECLARE
    jonathan_user_id UUID;
    jonathan_client_id UUID;
    ceo_prompt_id UUID;
    leadership_prompt_id UUID;
    existing_user_count INTEGER;
BEGIN
    -- Check if user already exists in auth.users
    SELECT COUNT(*) INTO existing_user_count 
    FROM auth.users 
    WHERE email = 'jonathan@company.com';
    
    IF existing_user_count = 0 THEN
        -- Create new user if doesn't exist
        -- Note: This creates a user without password - you'll need to set it via Supabase Auth UI
        jonathan_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role
        ) VALUES (
            jonathan_user_id,
            '00000000-0000-0000-0000-000000000000',
            'jonathan@company.com',
            crypt('ChangeMe123!', gen_salt('bf')), -- Temporary password
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Jonathan CEO"}',
            'authenticated',
            'authenticated'
        );
        
        RAISE NOTICE 'Created new auth user for Jonathan with email: jonathan@company.com';
        RAISE NOTICE 'IMPORTANT: Please set a proper password via Supabase Auth UI';
    ELSE
        -- Get existing user ID
        SELECT id INTO jonathan_user_id 
        FROM auth.users 
        WHERE email = 'jonathan@company.com';
        
        RAISE NOTICE 'Found existing auth user for Jonathan';
    END IF;
    
    -- Insert or update user profile in public.users table
    INSERT INTO users (id, email, full_name, role)
    VALUES (jonathan_user_id, 'jonathan@company.com', 'Jonathan CEO', 'client')
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        email = EXCLUDED.email;
    
    -- Check if client already exists
    SELECT id INTO jonathan_client_id 
    FROM clients 
    WHERE email = 'jonathan@company.com';
    
    IF jonathan_client_id IS NULL THEN
        -- Create new client record
        INSERT INTO clients (
            name, 
            company, 
            email, 
            user_id, 
            industry, 
            status, 
            portal_access, 
            mobile_pin, 
            content_preferences, 
            brand_guidelines
        )
        VALUES (
            'Jonathan',
            'Tech Company Inc',
            'jonathan@company.com',
            jonathan_user_id,
            'Technology',
            'active',
            true,
            '1234', -- Simple PIN for mobile access
            '{
                "tone": ["professional", "data-driven", "thought-provoking"],
                "topics": ["leadership", "tech trends", "business strategy", "team building"],
                "formats": ["insights", "questions", "case studies"],
                "avoid": ["overly casual", "without data backing", "generic advice"]
            }'::jsonb,
            'As a tech CEO with 15+ years of experience, Jonathan focuses on data-driven insights, practical leadership advice, and thought-provoking industry commentary. Always end posts with engaging questions to drive discussion.'
        )
        RETURNING id INTO jonathan_client_id;
        
        RAISE NOTICE 'Created new client record for Jonathan';
    ELSE
        -- Update existing client record
        UPDATE clients SET
            user_id = jonathan_user_id,
            portal_access = true,
            mobile_pin = COALESCE(mobile_pin, '1234'),
            status = 'active',
            content_preferences = '{
                "tone": ["professional", "data-driven", "thought-provoking"],
                "topics": ["leadership", "tech trends", "business strategy", "team building"],
                "formats": ["insights", "questions", "case studies"],
                "avoid": ["overly casual", "without data backing", "generic advice"]
            }'::jsonb,
            brand_guidelines = 'As a tech CEO with 15+ years of experience, Jonathan focuses on data-driven insights, practical leadership advice, and thought-provoking industry commentary. Always end posts with engaging questions to drive discussion.'
        WHERE id = jonathan_client_id;
        
        RAISE NOTICE 'Updated existing client record for Jonathan';
    END IF;
    
    -- Create CEO-specific prompts if they don't exist
    -- Check if CEO Leadership Insights prompt exists
    SELECT id INTO ceo_prompt_id 
    FROM prompt_templates 
    WHERE name = 'CEO Leadership Insights' 
    AND category = 'Content Generation';
    
    IF ceo_prompt_id IS NULL THEN
        INSERT INTO prompt_templates (
            name, 
            category, 
            system_message, 
            is_active, 
            is_default, 
            settings
        )
        VALUES (
            'CEO Leadership Insights',
            'Content Generation',
            'Write a LinkedIn post as an experienced tech CEO sharing leadership insights about {topic}. Use data-driven examples and end with a thought-provoking question.',
            true,
            false,
            '{"temperature": 0.7, "max_tokens": 500}'::jsonb
        )
        RETURNING id INTO ceo_prompt_id;
        
        RAISE NOTICE 'Created CEO Leadership Insights prompt template';
    END IF;
    
    -- Check if Tech Industry Commentary prompt exists
    SELECT id INTO leadership_prompt_id 
    FROM prompt_templates 
    WHERE name = 'Tech Industry Commentary' 
    AND category = 'Content Generation';
    
    IF leadership_prompt_id IS NULL THEN
        INSERT INTO prompt_templates (
            name, 
            category, 
            system_message, 
            is_active, 
            is_default, 
            settings
        )
        VALUES (
            'Tech Industry Commentary',
            'Content Generation',
            'Write a LinkedIn post analyzing tech industry trends about {topic}. Include market data, personal insights from 15+ years in tech, and predictions for the future.',
            true,
            false,
            '{"temperature": 0.6, "max_tokens": 600}'::jsonb
        )
        RETURNING id INTO leadership_prompt_id;
        
        RAISE NOTICE 'Created Tech Industry Commentary prompt template';
    END IF;
    
    RAISE NOTICE '✅ Jonathan CEO profile setup complete';
    RAISE NOTICE 'Client ID: %', jonathan_client_id;
    RAISE NOTICE 'User ID: %', jonathan_user_id;
    RAISE NOTICE 'Mobile PIN: 1234';
    
END $$;

-- Step 10: Create trigger to update timestamps
DROP TRIGGER IF EXISTS update_user_prompt_overrides_updated_at ON user_prompt_overrides;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_prompt_overrides_updated_at BEFORE UPDATE
    ON user_prompt_overrides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Multi-user system database migration completed successfully!';
    RAISE NOTICE '📊 Created tables: user_prompt_overrides, admin_sessions';
    RAISE NOTICE '🔧 Enhanced tables: clients, generated_content';
    RAISE NOTICE '👤 Demo user: Jonathan CEO setup complete';
    RAISE NOTICE '🚀 Ready for Phase 2: Admin Portal Implementation';
END $$;