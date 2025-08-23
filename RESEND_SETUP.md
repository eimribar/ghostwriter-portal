# Resend Email Configuration Guide

## ✅ Working Configuration (Verified Daily)

This configuration is **proven to work** - it sends daily Slack sync emails successfully.

### API Key
```
re_Vawe4nHB_BiRgoqiZmw1cWXjTyHZFBzS1
```

### From Address (MUST USE THIS)
```
Ghostwriter Portal <onboarding@resend.dev>
```

**IMPORTANT**: Do NOT use custom domains like `noreply@updates.yess.ai` unless they are verified in Resend dashboard. The `onboarding@resend.dev` domain is provided by Resend and always works.

## 📧 Environment Variables

### Required in `.env.local` (Development)
```bash
RESEND_API_KEY=re_Vawe4nHB_BiRgoqiZmw1cWXjTyHZFBzS1
VITE_RESEND_API_KEY=re_Vawe4nHB_BiRgoqiZmw1cWXjTyHZFBzS1
ADMIN_EMAIL=eimrib@yess.ai
VITE_ADMIN_EMAIL=eimrib@yess.ai
```

### Required in Vercel (Production)
Add these in Vercel Dashboard → Settings → Environment Variables:
- `RESEND_API_KEY` (for serverless functions)
- `VITE_RESEND_API_KEY` (for frontend)
- `ADMIN_EMAIL` (where to send notifications)
- `VITE_ADMIN_EMAIL` (for frontend)

## 🚀 Quick Implementation Template

### For Vercel Serverless Functions

```javascript
// api/your-email-function.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const email = await resend.emails.send({
      from: 'Ghostwriter Portal <onboarding@resend.dev>', // ALWAYS USE THIS
      to: ['recipient@example.com'],
      subject: 'Your Subject',
      html: '<p>Your HTML content</p>'
    });

    return res.status(200).json({ 
      success: true, 
      messageId: email.id 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
}
```

### For Frontend Services

```typescript
// src/services/your-email.service.ts
async function sendEmail(to: string, subject: string, html: string) {
  const apiUrl = process.env.NODE_ENV === 'production' 
    ? '/api/your-email-function'
    : 'http://localhost:3000/api/your-email-function';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject,
      html
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send email');
  }

  return response.json();
}
```

## 📋 Working Examples in Codebase

These files have working Resend implementations:

1. **Daily Slack Sync Emails** (Sends successfully every day at 9 AM)
   - File: `/api/slack-morning-sync.js`
   - Lines: 415-420
   
2. **Background Search Notifications**
   - File: `/api/send-email.js`
   - Lines: 86-91

3. **Process Search Results**
   - File: `/api/process-search.js`
   - Lines: 320-325

4. **Check and Notify**
   - File: `/api/check-and-notify.js`
   - Lines: 108-113

## 🔍 Testing Email Delivery

### Quick Test with cURL
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_Vawe4nHB_BiRgoqiZmw1cWXjTyHZFBzS1" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Ghostwriter Portal <onboarding@resend.dev>",
    "to": "eimrib@yess.ai",
    "subject": "Test Email",
    "html": "<p>This is a test email from Resend!</p>"
  }'
```

### Test from Browser Console
```javascript
fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer re_Vawe4nHB_BiRgoqiZmw1cWXjTyHZFBzS1',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'Ghostwriter Portal <onboarding@resend.dev>',
    to: 'eimrib@yess.ai',
    subject: 'Test from Browser',
    html: '<p>Testing Resend API from browser console!</p>'
  })
}).then(r => r.json()).then(console.log).catch(console.error);
```

## ⚠️ Common Issues & Solutions

### Issue: "Domain not verified" error
**Solution**: Use `onboarding@resend.dev` instead of custom domains

### Issue: Email not sending but no error
**Solution**: Check that RESEND_API_KEY is set in environment variables (without VITE_ prefix for serverless functions)

### Issue: CORS errors when calling from frontend
**Solution**: Always call through your API endpoint, not directly to Resend

### Issue: Works locally but not on Vercel
**Solution**: Ensure environment variables are set in Vercel Dashboard (both VITE_ and non-VITE_ versions)

## 📊 Current Usage

- **Daily Emails**: Slack sync summary (9 AM daily)
- **Event-based**: Background search completions
- **User-triggered**: SSO invitations, password resets

## 🔗 Resend Dashboard

Access at: https://resend.com/emails

Features:
- View sent emails
- Check delivery status
- Monitor API usage
- Domain verification (if needed)

## 💡 Best Practices

1. **Always use the verified sender**: `Ghostwriter Portal <onboarding@resend.dev>`
2. **Include both HTML and text versions** for better deliverability
3. **Add tags** to categorize emails in Resend dashboard
4. **Use proper error handling** and log failures
5. **Test locally first** before deploying to production

## 📝 Notes

- Current API key works and is actively used
- No need to verify custom domains unless specifically required
- The `onboarding@resend.dev` address is sufficient for all transactional emails
- Daily limit: Check Resend dashboard for current plan limits

---

Last Updated: August 23, 2025
Status: ✅ Working (Tested with daily Slack sync emails)