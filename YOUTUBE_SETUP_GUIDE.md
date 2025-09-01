# YouTube Ideation Feature Setup Guide

## Environment Variables Required

The YouTube transcript-to-ideas feature requires these environment variables in **Vercel**:

### 1. Database Configuration
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. AI Processing
```bash
OPENAI_API_KEY=sk-proj-your-key-here
```

### 3. YouTube Transcript Extraction
```bash
APIFY_API_KEY=apify_api_your-key-here
```

## How to Set Environment Variables in Vercel

1. **Go to Vercel Dashboard**
   - Navigate to your `ghostwriter-portal` project

2. **Settings → Environment Variables**
   - Click "Add New" for each variable
   - Set for **Production**, **Preview**, and **Development**

3. **Get the API Keys**
   - **Supabase**: From your Supabase project dashboard
   - **OpenAI**: From https://platform.openai.com/api-keys
   - **Apify**: From https://console.apify.com/account/integrations

## Testing the Setup

### 1. Check Configuration
The API will log environment status when called. Check Vercel function logs.

### 2. Test with YouTube URL
Use any YouTube video with captions, for example:
```
https://www.youtube.com/watch?v=9uHIKahbVIY
```

### 3. Expected Flow
1. User pastes YouTube URL in Ideation page
2. API extracts transcript via Apify
3. GPT-5 generates 5 content ideas
4. Ideas saved to database with metadata
5. Ideas appear in Ideation page with YouTube badge

## Troubleshooting

### CORS Errors
- **Fixed**: API now uses relative paths for all deployments
- **Solution**: Each deployment calls its own API endpoint

### Missing Environment Variables
- **Error**: Server returns specific missing variables
- **Solution**: Add all required variables to Vercel

### Apify API Errors
- **Common**: Video has no captions/transcript
- **Solution**: Use videos with subtitles/captions available

### GPT-5 API Errors  
- **Common**: Model access or quota issues
- **Solution**: Check OpenAI API key and usage limits

## Database Setup

Ensure you've run the database setup script:
```sql
-- In Supabase SQL Editor:
-- Run: FINAL_youtube_setup.sql
```

This creates:
- YouTube prompt templates
- `source_metadata` column in `content_ideas` table
- Helper functions for YouTube data

## Success Indicators

✅ Environment variables configured in Vercel
✅ Database setup script executed
✅ YouTube URL validation working
✅ Ideas appear with red YouTube badge
✅ Video metadata displayed in idea details

## Production URLs

- **Admin Portal**: https://admin.agentss.app (or ghostwriter-portal.vercel.app)
- **Client Portal**: https://www.agentss.app
- **API Endpoint**: `/api/youtube-ideation` (relative to deployment)