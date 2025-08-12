# Complete Setup Guide - Ghostwriter Portal

## 📊 Step 1: Supabase Setup

### Create Supabase Project:
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New project"
5. Fill in:
   - **Name**: `ghostwriter-portal`
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to you
   - **Plan**: Free tier is fine to start

### Get Your Credentials:
Once created, go to Settings → API:
- **Project URL**: `https://[YOUR-PROJECT-ID].supabase.co`
- **Anon/Public Key**: `eyJ...` (long string)

### Set Up Database:
1. Go to SQL Editor in Supabase dashboard
2. Click "New query"
3. Copy and paste the schema from `/supabase/schema.sql`
4. Click "Run"

---

## 🤖 Step 2: AI API Keys Setup

### OpenAI (GPT-4):
1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign in/Sign up
3. Go to API Keys
4. Click "Create new secret key"
5. Name it: `ghostwriter-portal`
6. Copy the key: `sk-...`

### Anthropic (Claude):
1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up for API access
3. Go to API Keys
4. Create new key
5. Copy the key: `sk-ant-...`

### Google AI (Gemini):
1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Select your project or create new
4. Copy the key: `AIza...`

---

## 🔍 Step 3: Apify Setup (LinkedIn Scraping)

### Create Apify Account:
1. Go to [https://apify.com](https://apify.com)
2. Sign up for free account
3. Go to Settings → Integrations
4. Copy your API token

### Set Up LinkedIn Scraper:
1. Go to Apify Store
2. Search for "LinkedIn Profile Scraper"
3. Click "Try for free"
4. Note the Actor ID for later

---

## 🖼️ Step 4: Cloudinary Setup (Optional - for media)

### Create Cloudinary Account:
1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for free
3. Go to Dashboard
4. Note your:
   - **Cloud Name**: `your-cloud-name`
   - **API Key**: `123456789012345`
   - **API Secret**: `abc...`

---

## ⚙️ Step 5: Environment Variables

Create `.env.local` file in your ghostwriter-portal folder:

```env
# Supabase
VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...

# AI APIs (for backend/edge functions)
VITE_OPENAI_API_KEY=sk-...your-openai-key...
VITE_ANTHROPIC_API_KEY=sk-ant-...your-anthropic-key...
VITE_GOOGLE_AI_API_KEY=AIza...your-google-key...

# Apify
VITE_APIFY_API_TOKEN=apify_api_...your-token...

# Cloudinary (optional)
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_API_KEY=123456789012345
```

---

## 🔐 Step 6: Update Vercel Environment Variables

### Add to Vercel:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select `ghostwriter-portal`
3. Go to Settings → Environment Variables
4. Add each variable from `.env.local`
5. Click "Save"

---

## 📝 Step 7: Quick Test Checklist

### Local Testing:
```bash
npm run dev
```

1. ✅ Login works with Supabase Auth
2. ✅ Content Lake loads data
3. ✅ AI Generation creates real content
4. ✅ Settings page saves API keys
5. ✅ Database operations work

### Production Testing:
```bash
git push origin main
```
Wait for Vercel deployment, then test all features.

---

## 🎯 Step 8: Initial Data Setup

### Add Test Creators:
Run this in Supabase SQL Editor:

```sql
-- Insert sample creators
INSERT INTO public.creators (name, linkedin_url, follower_count, bio, average_reactions)
VALUES 
  ('Justin Welsh', 'https://linkedin.com/in/justinwelsh', 475000, 'Building one-person businesses', 850),
  ('Sahil Bloom', 'https://linkedin.com/in/sahilbloom', 890000, 'Sharing ideas on growth', 1200),
  ('Jasmin Alic', 'https://linkedin.com/in/jasminalic', 125000, 'Helping brands tell stories', 650);
```

---

## 🚨 Common Issues & Solutions

### Issue: Supabase connection fails
- Check if URL and key are correct
- Ensure RLS policies are set up
- Check if tables were created

### Issue: AI APIs not working
- Verify API keys are valid
- Check if you have credits/quota
- Ensure keys are in environment variables

### Issue: Vercel deployment fails
- Check build logs
- Ensure all env variables are set
- Try rebuilding locally first

---

## 📞 Need Help?

1. **Supabase Docs**: https://supabase.com/docs
2. **OpenAI Docs**: https://platform.openai.com/docs
3. **Anthropic Docs**: https://docs.anthropic.com
4. **Vercel Docs**: https://vercel.com/docs

---

## ✅ You're All Set!

Once everything is configured:
1. Your portal will have real authentication
2. AI will generate actual content
3. Data will persist in Supabase
4. LinkedIn scraping will work
5. Everything will be production-ready!