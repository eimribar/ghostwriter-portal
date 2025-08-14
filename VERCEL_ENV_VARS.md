# Vercel Environment Variables Setup

## CRITICAL: API Endpoints Cannot Use VITE_ Prefixed Variables!

Vercel serverless functions (API routes) **cannot access VITE_ prefixed environment variables**. Those are only for the frontend build process.

## Required Environment Variables for Vercel

You must add these environment variables in the Vercel Dashboard:
**Settings → Environment Variables**

### Backend API Variables (WITHOUT VITE_ prefix) - REQUIRED:
```
OPENAI_API_KEY=(Get from .env.local - starts with sk-proj-)
SUPABASE_URL=https://ifwscuvbtdokljwwbvex.supabase.co
SUPABASE_ANON_KEY=(Get from .env.local - starts with eyJ)
RESEND_API_KEY=(Get from .env.local - starts with re_)
ADMIN_EMAIL=eimrib@yess.ai
```

### Frontend Variables (WITH VITE_ prefix) - REQUIRED:
```
VITE_OPENAI_API_KEY=(Same as OPENAI_API_KEY above)
VITE_SUPABASE_URL=https://ifwscuvbtdokljwwbvex.supabase.co
VITE_SUPABASE_ANON_KEY=(Same as SUPABASE_ANON_KEY above)
VITE_GOOGLE_API_KEY=(Get from .env.local - starts with AIza)
VITE_RESEND_API_KEY=(Same as RESEND_API_KEY above)
VITE_ADMIN_EMAIL=eimrib@yess.ai
VITE_ENV=production
```

### Optional (Add both versions if using):
```
GOOGLE_API_KEY=(Same as VITE_GOOGLE_API_KEY)
```

## Quick Reference - All Keys Needed

Get these from your `.env.local` file:
1. **OpenAI API Key**: Starts with `sk-proj-`
2. **Supabase URL**: `https://ifwscuvbtdokljwwbvex.supabase.co`
3. **Supabase Anon Key**: Starts with `eyJ`
4. **Google API Key**: Starts with `AIza`
5. **Resend API Key**: Starts with `re_`
6. **Admin Email**: `eimrib@yess.ai`

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