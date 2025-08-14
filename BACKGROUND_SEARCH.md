# Background Search Feature Documentation

## Overview
The Background Search feature allows users to initiate GPT-5 powered web searches that run asynchronously, enabling users to continue working while the search processes. Results are saved to the database and users are notified via email when complete.

## How It Works

### User Flow
1. User clicks "News & Trends" button in Ideation page
2. Confirmation modal appears immediately
3. User can close modal and continue working
4. GPT-5 searches the web (2-5 minutes)
5. Results saved to database
6. Email notification sent to admin
7. Ideas appear in Ideation page

### Technical Flow
```mermaid
User clicks "News & Trends"
    ↓
Create job in search_jobs table (status: pending)
    ↓
Show confirmation modal to user
    ↓
Call /api/process-search endpoint
    ↓
GPT-5 API called with web_search tool
    ↓
Parse response and save ideas to content_ideas
    ↓
Update job status to completed
    ↓
Send email notification via Resend
    ↓
Ideas visible in UI
```

## Components

### Frontend Components

#### Ideation.tsx
- **News & Trends Button**: Initiates background search
- **Confirmation Modal**: Shows success message with instructions
- **Check Emails Button**: Manually triggers email check
- **Active Jobs Indicator**: Shows count of running searches

#### Key Functions:
```typescript
handleGenerateNewsIdeas() // Starts background search
checkAndSendPendingEmails() // Manual email trigger
loadActiveJobs() // Loads pending/processing jobs
```

### Backend Services

#### search-jobs.service.ts
Manages the search jobs in database:
- `create()` - Creates new search job
- `getPendingJobs()` - Gets jobs to process
- `updateStatus()` - Updates job status
- `getActiveJobs()` - Gets running jobs

#### background-processor.service.ts
Browser-based processor that:
- Polls for pending jobs every 30 seconds
- Calls Vercel API to process jobs
- Auto-starts when app loads

### API Endpoints (Vercel Serverless Functions)

#### /api/process-search
Main processing endpoint:
- Receives job ID
- Calls GPT-5 Responses API
- Parses response
- Saves ideas to database
- Sends email notification

#### /api/send-email
Simple email sender:
- Sends notification emails
- Uses Resend API
- Fallback for manual sending

#### /api/check-and-notify
Notification checker:
- Finds completed jobs without notifications
- Sends pending emails
- Can be triggered manually

## Database Schema

### search_jobs Table
```sql
CREATE TABLE search_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query TEXT NOT NULL,           -- The search query
  search_params JSONB,                  -- Additional parameters
  status TEXT,                          -- pending/processing/completed/failed
  result_count INTEGER,                 -- Number of ideas generated
  ideas_generated TEXT[],               -- Array of idea IDs
  result_summary TEXT,                  -- Summary of results
  processing_time_seconds INTEGER,      -- Processing duration
  error_message TEXT,                   -- Error if failed
  notification_sent BOOLEAN DEFAULT false, -- Email sent flag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,               -- When processing started
  completed_at TIMESTAMPTZ              -- When completed
);
```

## GPT-5 Integration

### API Call Structure
```javascript
{
  model: 'gpt-5',
  input: [{
    role: 'user',
    content: [{
      type: 'input_text',
      text: 'find me the top 10 trending topics...'
    }]
  }],
  tools: [{ type: 'web_search' }],  // Enables web search
  tool_choice: 'auto',
  reasoning: { effort: 'medium' },
  temperature: 1,
  max_output_tokens: 8192
}
```

### Response Parsing
```javascript
// GPT-5 response structure
{
  output: [
    { type: 'reasoning', ... },
    { 
      type: 'message',
      content: [{
        type: 'output_text',
        text: 'JSON with ideas'
      }]
    }
  ]
}

// Extract text from response
const messageOutput = gptData.output.find(o => o.type === 'message');
const textContent = messageOutput.content.find(c => c.type === 'output_text');
const responseText = textContent.text;
```

## Email Notifications

### Email Template
- Sent via Resend API
- HTML formatted with styling
- Includes:
  - Search query
  - Number of ideas generated
  - Top 3 ideas preview
  - Link to view all results
  - Processing time

### Configuration
```bash
RESEND_API_KEY=re_xxxx  # Your Resend API key
ADMIN_EMAIL=eimrib@yess.ai  # Where to send notifications
```

## Configuration

### Environment Variables Required

#### Backend (Serverless Functions):
```bash
OPENAI_API_KEY      # GPT-5 API access
SUPABASE_URL        # Database URL
SUPABASE_ANON_KEY   # Database auth
RESEND_API_KEY      # Email service
ADMIN_EMAIL         # Notification recipient
```

#### Frontend (React App):
```bash
VITE_OPENAI_API_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_RESEND_API_KEY
VITE_ADMIN_EMAIL
```

## Testing

### Manual Testing Steps
1. Open browser console (F12)
2. Go to Ideation page
3. Click "News & Trends"
4. Check console for:
   - "🚀 STARTING BACKGROUND NEWS SEARCH"
   - "✅ Search job created"
   - "📡 Triggering API to process search job"
5. Wait 2-5 minutes
6. Check email or click "Check Emails"
7. Refresh page to see new ideas

### API Testing
```bash
# Test GPT-5 connection
curl https://your-app.vercel.app/api/test-simple

# Trigger email check
curl https://your-app.vercel.app/api/check-and-notify

# Send test email
curl -X POST https://your-app.vercel.app/api/send-email \
  -H "Content-Type: application/json" \
  -d '{"searchQuery": "Test", "resultCount": 5}'
```

### Database Monitoring
```sql
-- View recent jobs
SELECT * FROM search_jobs 
ORDER BY created_at DESC 
LIMIT 10;

-- Check processing status
SELECT status, COUNT(*) 
FROM search_jobs 
GROUP BY status;

-- Find stuck jobs
SELECT * FROM search_jobs 
WHERE status = 'processing' 
AND started_at < NOW() - INTERVAL '10 minutes';
```

## Troubleshooting

### Common Issues

#### Jobs not processing
- Check background processor is running
- Verify API endpoints are deployed
- Check environment variables

#### No email received
- Verify RESEND_API_KEY is set
- Check ADMIN_EMAIL is correct
- Look for errors in Vercel logs

#### Ideas not showing
- Check database for saved ideas
- Verify parsing is working
- Refresh the Ideation page

## Performance

### Metrics
- **Search time**: 2-5 minutes
- **Token usage**: ~1.2M per search
- **Ideas generated**: 1-10 per search
- **Email delivery**: <2 seconds
- **Background poll**: Every 30 seconds

### Optimization Tips
- Batch multiple searches together
- Use specific search queries
- Monitor token usage in OpenAI dashboard
- Clear old completed jobs periodically

## Future Enhancements
- [ ] Add search history view
- [ ] Implement search templates
- [ ] Add webhook for instant notifications
- [ ] Create search scheduling
- [ ] Add search result filtering
- [ ] Implement retry mechanism for failed jobs
- [ ] Add progress tracking
- [ ] Create admin dashboard for job monitoring