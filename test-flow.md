# Test Flow Guide - Ghostwriter Portal

## 1. Check Prompts are Populated

1. Navigate to http://localhost:5173/prompts (or your deployed URL)
2. You should see 4 Content Generation prompts:
   - RevOps & Technical Focus
   - SaaStr & Management Focus  
   - Sales Excellence Focus
   - Data & Listicle Focus
3. Click "View" on any prompt to see the full system message

## 2. Test Content Generation

1. Go to http://localhost:5173/generate
2. Enter a content idea like: "How AI agents are changing B2B sales"
3. Click "Generate Variations"
4. You should see:
   - 4 different variations generated
   - Each with a different style based on the prompts
   - Auto-save indicator showing "Saved to database"

## 3. Test Approval Flow

1. Go to http://localhost:5173/approval
2. You should see the content you just generated with status "draft"
3. Click "Approve" on one of the variations
4. The status should change to "admin_approved"
5. It should disappear from the draft view

## 4. Check User Portal (if running)

1. Navigate to http://localhost:8080/approve (User Portal)
2. You should see the admin-approved content
3. User can approve/reject from their side

## Expected Database States

After running the SQL scripts:
- `prompt_templates` table should have 6 rows (4 Content Generation + 2 placeholders)
- Check in Supabase Table Editor: https://supabase.com/dashboard/project/ifwscuvbtdokljwwbvex/editor

After generating content:
- `generated_content` table should have new rows with status='draft'
- After approval, status should be 'admin_approved'

## Quick SQL Checks

Run these in Supabase SQL Editor to verify:

```sql
-- Check prompts are loaded
SELECT name, category, LENGTH(system_message) as message_length 
FROM prompt_templates 
WHERE category = 'Content Generation';

-- Check generated content
SELECT id, status, created_at, content_text 
FROM generated_content 
ORDER BY created_at DESC 
LIMIT 10;

-- Check approval flow
SELECT status, COUNT(*) 
FROM generated_content 
GROUP BY status;
```

## Troubleshooting

If prompts don't appear:
- Check browser console for errors
- Verify Supabase connection
- Make sure both SQL scripts ran successfully

If generation fails:
- Check VITE_GOOGLE_API_KEY is set
- Check browser console for API errors
- Verify the prompt templates loaded correctly

If approval doesn't work:
- Check the status values in database
- Ensure RLS policies allow updates
- Check browser console for errors