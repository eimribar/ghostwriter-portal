# 🚨 URGENT: Database Setup Required

## The Problem
Posts are not being saved because the `generated_content` table is missing from your Supabase database.

## Immediate Fix Required

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `ifwscuvbtdokljwwbvex`
3. Navigate to the **SQL Editor** (left sidebar)

### Step 2: Run the Migration Script
1. Open the file `supabase_migration.sql` in this directory
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 3: Verify Table Creation
After running the script, you should see:
- Success message confirming table creation
- A list of columns from the new `generated_content` table

### Step 4: Test Content Generation
1. Go back to the Ghostwriter Portal
2. Navigate to Generate page
3. Select a client from dropdown
4. Create content
5. Check if "Saved! Content sent to approval queue" appears
6. Go to Approval page - content should be visible

## What the Migration Creates

The script creates a `generated_content` table with:
- All necessary columns for content storage
- Status tracking for two-step approval flow
- Indexes for performance
- Row Level Security policies
- Automatic timestamp updates

## Alternative: Quick Test

To quickly verify the table exists after creation:
```sql
SELECT COUNT(*) FROM generated_content;
```

This should return `0` (or a number if you have data).

## Troubleshooting

If you get an error about missing `clients` or `content_ideas` tables, you need to create those first:

```sql
-- Create clients table if missing
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  linkedin_url TEXT,
  website TEXT,
  industry TEXT,
  status TEXT DEFAULT 'active',
  posting_frequency TEXT,
  content_preferences JSONB,
  brand_guidelines TEXT,
  notes TEXT,
  assigned_ghostwriter UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create content_ideas table if missing
CREATE TABLE IF NOT EXISTS content_ideas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  ghostwriter_id UUID,
  user_id TEXT,
  source_post_id UUID,
  source TEXT,
  title TEXT,
  description TEXT,
  hook TEXT,
  key_points TEXT[],
  target_audience TEXT,
  content_format TEXT,
  category TEXT,
  priority TEXT,
  status TEXT DEFAULT 'draft',
  score DECIMAL,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Contact Support
If you continue to have issues after running the migration:
1. Check the browser console for specific error messages
2. Verify your Supabase ANON key is correct
3. Check Supabase logs for any database errors