# Vercel Environment Variables Setup

## CRITICAL: API Endpoints Cannot Use VITE_ Prefixed Variables!

Vercel serverless functions (API routes) **cannot access VITE_ prefixed environment variables**. Those are only for the frontend build process.

## Required Environment Variables for Vercel

You must add these environment variables in the Vercel Dashboard:
**Settings → Environment Variables**

### Backend API Variables (WITHOUT VITE_ prefix):
```
OPENAI_API_KEY=[Your OpenAI API key from .env.local]
SUPABASE_URL=[Your Supabase URL from .env.local]
SUPABASE_ANON_KEY=[Your Supabase anon key from .env.local]
RESEND_API_KEY=[Your Resend API key from .env.local]
ADMIN_EMAIL=[Your admin email from .env.local]
```

### Frontend Variables (WITH VITE_ prefix - already set):
```
VITE_OPENAI_API_KEY=[Same as OPENAI_API_KEY above]
VITE_SUPABASE_URL=[Same as SUPABASE_URL above]
VITE_SUPABASE_ANON_KEY=[Same as SUPABASE_ANON_KEY above]
VITE_GOOGLE_API_KEY=[Your Google API key]
VITE_RESEND_API_KEY=[Same as RESEND_API_KEY above]
VITE_ADMIN_EMAIL=[Same as ADMIN_EMAIL above]
VITE_ENV=production
```

**Note**: Copy the actual values from your `.env.local` file when adding to Vercel.

## How to Add in Vercel:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable WITHOUT the VITE_ prefix for API use
4. Keep the VITE_ prefixed ones for frontend use
5. Click **Save**
6. **IMPORTANT**: Redeploy your application after adding variables

## Why This is Necessary:

- **Frontend (React/Vite)**: Uses `VITE_` prefixed variables via `import.meta.env`
- **Backend (API Routes)**: Uses non-prefixed variables via `process.env`
- Vercel serverless functions run in Node.js environment, not Vite environment

## Testing:

After adding these variables and redeploying:
1. Click "News & Trends" in the Ideation page
2. Check browser console for logs
3. Check OpenAI dashboard for API calls
4. You should see GPT-5 API calls being made

## Updated API Endpoints:

All API endpoints have been updated to use fallback pattern:
```javascript
process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
```

This allows them to work with either naming convention, but in production, the non-VITE version is required.