# Setting Up Background Search with Email Notifications

## Overview
The background search system allows you to start GPT-5 searches that run in the background and email you when complete. You can leave the page and come back later to see results.

## Setup Steps

### 1. Create Database Table
Run this SQL in Supabase dashboard (https://supabase.com/dashboard/project/ifwscuvbtdokljwwbvex/sql/new):
```sql
-- Copy contents of create_search_jobs_table.sql
```

### 2. Set Up Email Service (Resend)
1. Sign up for free at https://resend.com
2. Get your API key from the dashboard
3. Add to `.env.local`:
```
VITE_ADMIN_EMAIL=your-email@example.com
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 3. Deploy Supabase Edge Function

#### Option A: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref ifwscuvbtdokljwwbvex

# Deploy the function
supabase functions deploy process-search

# Set environment variables
supabase secrets set OPENAI_API_KEY=your-gpt5-key
supabase secrets set RESEND_API_KEY=your-resend-key
supabase secrets set ADMIN_EMAIL=your-email@example.com
```

#### Option B: Manual Setup in Dashboard
1. Go to https://supabase.com/dashboard/project/ifwscuvbtdokljwwbvex/functions
2. Create new function called "process-search"
3. Copy contents of `/supabase/functions/process-search/index.ts`
4. Add environment variables in function settings

### 4. Set Up Database Webhook (Trigger)
In Supabase dashboard, create a database webhook:
1. Go to Database → Webhooks
2. Create new webhook:
   - Name: "process-search-jobs"
   - Table: search_jobs
   - Events: INSERT
   - Conditions: status = 'pending'
   - URL: https://ifwscuvbtdokljwwbvex.supabase.co/functions/v1/process-search
   - Method: POST
   - Headers: Add your service role key

### 5. Alternative: Simple Webhook Service
If you want to avoid Supabase Edge Functions, use Pipedream:
1. Create account at https://pipedream.com
2. Create new workflow
3. Trigger: Webhook
4. Step 1: HTTP Request to GPT-5 API
5. Step 2: Save results to Supabase
6. Step 3: Send email via Resend
7. Get webhook URL and add to Supabase database trigger

## How It Works

1. **Start Search**: Click "News & Trends" → "Start Background Search"
2. **Job Created**: Search job saved to database with status "pending"
3. **Background Processing**: Edge function processes GPT-5 search (2-5 min)
4. **Save Results**: Ideas saved to content_ideas table
5. **Email Sent**: You receive email with summary and link
6. **View Results**: Click link in email or refresh Ideation page

## Testing

### Test Locally (Without Edge Function)
```javascript
// In browser console on Ideation page:
// This simulates what the Edge Function does

const testJob = {
  search_query: "test search",
  search_params: { count: 3 }
};

// Check if job was created
console.log('Check Supabase for new search_jobs entry');
```

### Test Email Service
```javascript
// Test email sending from browser console
import { emailService } from './src/services/email.service';

emailService.sendSearchCompletionEmail({
  searchQuery: "Test search",
  resultCount: 10,
  topIdeas: [
    { title: "Test Idea 1", description: "Description 1", score: 9.5 },
    { title: "Test Idea 2", description: "Description 2", score: 8.7 },
    { title: "Test Idea 3", description: "Description 3", score: 8.2 }
  ],
  searchDuration: "2m 45s",
  jobId: "test-123"
});
```

## Email Template Preview
You'll receive emails like:
```
Subject: ✨ Your Content Ideas Are Ready! (10 ideas found)

Your search has completed successfully!

Search: "B2B SaaS, AI, Marketing trends"
Results: 10 ideas generated
Top Score: 9.2/10

Top 3 Ideas:
1. "Oracle's $9B AI Investment" (Score: 9.2/10)
   Major tech news about enterprise AI

2. "Marketing Automation Trends 2025" (Score: 8.5/10)
   Latest B2B marketing insights

3. "SaaS Pricing Revolution" (Score: 8.1/10)
   How AI is changing SaaS pricing models

[View All Results →]
```

## Troubleshooting

### Ideas not saving?
- Run `disable_rls_temporarily.sql` in Supabase

### Email not sending?
- Check RESEND_API_KEY is correct
- Verify ADMIN_EMAIL is set
- Check Resend dashboard for logs

### Edge Function not running?
- Check Supabase Functions logs
- Verify environment variables are set
- Test webhook manually

### Background search not starting?
- Check browser console for errors
- Verify search_jobs table exists
- Check Supabase connection

## Production Checklist
- [ ] Set real ADMIN_EMAIL
- [ ] Add RESEND_API_KEY
- [ ] Deploy Edge Function
- [ ] Set up database webhook
- [ ] Test end-to-end flow
- [ ] Enable RLS policies properly
- [ ] Set VITE_ENV=production