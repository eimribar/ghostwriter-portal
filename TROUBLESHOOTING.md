# TROUBLESHOOTING GUIDE - Ghostwriter Portal

## Common Issues and Solutions

### 🔴 Critical Issue: GPT-5 API Not Being Called

#### Symptoms:
- No logs in OpenAI dashboard
- "Searching for trending topics" shows but doesn't complete
- Background search seems to run but no results

#### Root Cause:
Vercel serverless functions cannot access `VITE_` prefixed environment variables.

#### Solution:
Add duplicate environment variables WITHOUT the VITE_ prefix in Vercel Dashboard:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `ADMIN_EMAIL`
3. Use the SAME values as your VITE_ versions
4. Redeploy the application

---

### 🔴 Issue: GPT-5 Returns 400 Error

#### Symptoms:
- API call fails with status 400
- Error message about "unsupported_parameter"

#### Root Cause:
Wrong parameter name in API request.

#### Solution:
Change `max_completion_tokens` to `max_output_tokens` in:
- `/api/process-search.js`
- Any other files calling GPT-5 API

---

### 🟡 Issue: Ideas Not Displaying After Search

#### Symptoms:
- GPT-5 API called successfully
- Email notification sent
- But no ideas show in Ideation page

#### Root Cause:
Response parsing issue - GPT-5 Responses API has different structure.

#### Solution:
Response is in `output[1].content[0].text`. The parsing code should:
```javascript
const messageOutput = gptData.output.find(o => o.type === 'message');
const textContent = messageOutput.content.find(c => c.type === 'output_text');
const responseText = textContent.text;
```

---

### 🟡 Issue: Email Notifications Not Sending

#### Symptoms:
- Search completes but no email received
- "Check Emails" button doesn't work

#### Root Cause:
Missing or incorrect Resend API configuration.

#### Solution:
1. Verify `RESEND_API_KEY` is set in Vercel (without VITE_ prefix)
2. Verify `ADMIN_EMAIL` is set correctly
3. Check Resend dashboard for failed sends
4. Test with `/api/send-email` endpoint directly

---

### 🟡 Issue: Background Search Gets Stuck

#### Symptoms:
- Modal shows "searching" indefinitely
- No completion or error

#### Root Cause:
Job not being processed by background processor.

#### Solution:
1. Check browser console for processor logs
2. Verify background processor is starting: "🚀 Background processor started"
3. Check if jobs are in database: Query `search_jobs` table
4. Manually trigger with "Check Emails" button

---

### 🟢 Issue: Blank Page on Production

#### Symptoms:
- Site loads but shows blank page
- Works locally but not on Vercel

#### Root Cause:
Missing environment variables.

#### Solution:
Add ALL required environment variables in Vercel Dashboard:
- Both VITE_ prefixed (for frontend)
- AND non-prefixed versions (for backend)

---

### 🟢 Issue: "Variable already exists" in Vercel

#### Symptoms:
- Can't add environment variable
- Error about duplicate variable

#### Solution:
1. Delete the existing variable first
2. Re-add with new value
3. Or use "Edit" button to update existing

---

## Debugging Tools

### Check API Endpoints
```bash
# Test GPT-5 connection
curl https://ghostwriter-portal.vercel.app/api/test-simple

# Test email sending
curl -X POST https://ghostwriter-portal.vercel.app/api/send-email \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check pending notifications
curl https://ghostwriter-portal.vercel.app/api/check-and-notify
```

### Browser Console Commands
```javascript
// Check if background processor is running
console.log('Processor running:', !!window.backgroundProcessor);

// Manually check for jobs
await searchJobsService.getPendingJobs();

// Force email check
await checkAndSendPendingEmails();
```

### Database Queries (Supabase)
```sql
-- Check search jobs
SELECT * FROM search_jobs ORDER BY created_at DESC;

-- Check for pending jobs
SELECT * FROM search_jobs WHERE status = 'pending';

-- Check completed but not notified
SELECT * FROM search_jobs 
WHERE status = 'completed' 
AND notification_sent = false;

-- View recent ideas
SELECT * FROM content_ideas 
ORDER BY created_at DESC 
LIMIT 10;
```

## Environment Variable Checklist

### In Vercel Dashboard, verify these are set:

#### Backend (No VITE_ prefix):
- [ ] `OPENAI_API_KEY`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `ADMIN_EMAIL`

#### Frontend (With VITE_ prefix):
- [ ] `VITE_OPENAI_API_KEY`
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_GOOGLE_API_KEY`
- [ ] `VITE_RESEND_API_KEY`
- [ ] `VITE_ADMIN_EMAIL`
- [ ] `VITE_ENV`

## Quick Fixes

### Force Reprocess All Pending Jobs
```sql
UPDATE search_jobs 
SET status = 'pending' 
WHERE status = 'processing' 
AND created_at < NOW() - INTERVAL '10 minutes';
```

### Clear Stuck Jobs
```sql
UPDATE search_jobs 
SET status = 'failed', 
    error_message = 'Timeout - manually cleared' 
WHERE status = 'processing' 
AND created_at < NOW() - INTERVAL '1 hour';
```

### Resend All Pending Notifications
```sql
UPDATE search_jobs 
SET notification_sent = false 
WHERE status = 'completed' 
AND notification_sent = true 
AND completed_at > NOW() - INTERVAL '1 day';
```

## Contact for Support

If issues persist after trying these solutions:
- Check logs in Vercel Dashboard → Functions tab
- Review browser console for errors
- Email: eimrib@yess.ai
- GitHub Issues: https://github.com/eimribar/ghostwriter-portal/issues

## Prevention Tips

1. **Always test locally first** with proper .env.local setup
2. **Check OpenAI dashboard** for API activity
3. **Monitor Vercel Functions logs** for serverless errors
4. **Use test endpoints** (`/api/test-simple`, `/api/test-gpt5`) to verify setup
5. **Keep documentation updated** when making changes