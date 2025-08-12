# Ghostwriter Portal - Production Setup Guide

## Overview
This guide walks you through setting up the Ghostwriter Portal for production, including database configuration, API integrations, and deployment.

## Prerequisites
- Node.js 18+ and npm
- Supabase account
- API keys for LLM providers (OpenAI, Anthropic, Google)
- Apify account for LinkedIn scraping
- Vercel account for deployment

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key

### 1.2 Set Up Database Schema
1. Go to SQL Editor in Supabase dashboard
2. Copy the entire contents of `/supabase/schema.sql`
3. Run the SQL to create all tables, indexes, and policies

### 1.3 Configure Authentication
1. Go to Authentication > Providers
2. Enable Email authentication
3. Configure password requirements and email templates

### 1.4 Set Up Row Level Security
The schema already includes RLS policies. Verify they're enabled:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

## Step 2: API Keys Configuration

### 2.1 OpenAI
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Create a new API key with appropriate permissions
3. Set usage limits to prevent unexpected charges

### 2.2 Anthropic Claude
1. Get API key from [console.anthropic.com](https://console.anthropic.com)
2. Configure rate limits and usage alerts

### 2.3 Google Gemini
1. Get API key from [makersuite.google.com](https://makersuite.google.com)
2. Enable Gemini API in Google Cloud Console

### 2.4 Apify
1. Sign up at [apify.com](https://apify.com)
2. Get API token from Account Settings
3. Subscribe to LinkedIn scraping actors:
   - LinkedIn Profile Scraper
   - LinkedIn Posts Scraper
   - LinkedIn Search Scraper

## Step 3: Environment Variables

Create `.env.local` file:
```bash
cp .env.example .env.local
```

Fill in all required values:
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# LLM APIs
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_GOOGLE_API_KEY=AIza...

# Apify
VITE_APIFY_API_KEY=apify_api_...

# Feature Flags
VITE_ENABLE_AUTO_APPROVE=false
VITE_ENABLE_REAL_PUBLISH=false
VITE_ENV=production
```

## Step 4: Local Development

### 4.1 Install Dependencies
```bash
npm install
```

### 4.2 Run Development Server
```bash
npm run dev
```

### 4.3 Test Database Connection
1. Check browser console for any Supabase errors
2. Try creating a test client in the Clients page
3. Verify data persists after page refresh

## Step 5: Production Deployment

### 5.1 Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts and add environment variables
```

### 5.2 Configure Environment Variables in Vercel
1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add all variables from `.env.local`
3. Ensure variables are set for Production environment

### 5.3 Set Up Custom Domain (Optional)
1. Go to Vercel Dashboard > Your Project > Settings > Domains
2. Add your custom domain
3. Configure DNS settings as instructed

## Step 6: Post-Deployment Configuration

### 6.1 Set Up Automation Rules
1. Log in to the deployed app
2. Go to Settings > Automation
3. Configure scraping schedules
4. Set up content generation rules

### 6.2 Configure Webhooks (Optional)
For LinkedIn publishing:
1. Set up webhook endpoint for scheduled posts
2. Configure LinkedIn API integration
3. Test with a sample post

### 6.3 Set Up Monitoring
1. Enable Vercel Analytics
2. Set up error tracking (e.g., Sentry)
3. Configure uptime monitoring

## Step 7: Testing Production Features

### 7.1 Test Content Scraping
```javascript
// In browser console
import { apifyService } from './src/services/apify.service';

// Test profile scraping
const profile = await apifyService.scrapeProfile('https://linkedin.com/in/example');
console.log(profile);

// Test post scraping
const posts = await apifyService.scrapePosts('https://linkedin.com/in/example', 5);
console.log(posts);
```

### 7.2 Test Content Generation
```javascript
// Test with different LLM providers
import { generateContent } from './src/lib/llm-service';

const result = await generateContent({
  prompt: 'Create a LinkedIn post about AI in business',
  provider: 'openai',
  temperature: 0.7
});
console.log(result);
```

### 7.3 Test Database Operations
```javascript
// Test client CRUD operations
import { clientsService } from './src/services/database.service';

const clients = await clientsService.getAll();
console.log(clients);
```

## Step 8: Security Checklist

- [ ] All API keys are stored as environment variables
- [ ] Supabase RLS policies are enabled and tested
- [ ] No sensitive data in client-side code
- [ ] HTTPS enabled on production domain
- [ ] Rate limiting configured for API endpoints
- [ ] Input validation on all forms
- [ ] XSS protection enabled
- [ ] CORS properly configured

## Step 9: Performance Optimization

### 9.1 Enable Caching
- Configure Vercel Edge caching
- Set up Supabase query caching
- Implement browser caching for static assets

### 9.2 Optimize Database Queries
- Add appropriate indexes (already in schema)
- Use pagination for large datasets
- Implement lazy loading for content

### 9.3 Monitor Performance
- Use Vercel Analytics
- Set up Real User Monitoring (RUM)
- Monitor database query performance

## Step 10: Maintenance & Updates

### 10.1 Regular Tasks
- Monitor API usage and costs
- Review automation logs weekly
- Update prompt templates based on performance
- Clean up old data periodically

### 10.2 Backup Strategy
- Enable Supabase automatic backups
- Export critical data weekly
- Document custom configurations

### 10.3 Update Process
1. Test updates in development
2. Deploy to staging environment
3. Run integration tests
4. Deploy to production during low-traffic hours
5. Monitor for issues

## Troubleshooting

### Common Issues

#### Supabase Connection Failed
- Check VITE_SUPABASE_URL format
- Verify anon key is correct
- Check RLS policies aren't blocking access

#### LLM API Errors
- Verify API keys are valid
- Check rate limits haven't been exceeded
- Ensure proper error handling in place

#### Apify Scraping Failed
- Check API token is valid
- Verify actor subscriptions are active
- Check proxy configuration

#### Content Not Generating
- Verify prompt templates are configured
- Check LLM provider is responding
- Review error logs in browser console

### Debug Mode
Enable debug mode in `.env.local`:
```env
VITE_DEBUG=true
```

This will log additional information to help diagnose issues.

## Support & Resources

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Apify Docs](https://docs.apify.com)
- [Vercel Docs](https://vercel.com/docs)

### Getting Help
- Check the browser console for errors
- Review Vercel function logs
- Check Supabase logs for database errors
- Contact support with error messages and steps to reproduce

## Production Readiness Checklist

- [ ] Database schema deployed
- [ ] All API keys configured
- [ ] Authentication working
- [ ] Content scraping tested
- [ ] Content generation tested
- [ ] Automation rules configured
- [ ] Error handling implemented
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Security measures verified
- [ ] Performance optimized
- [ ] Documentation complete

## Next Steps

1. **Add Team Members**: Invite ghostwriters through Supabase Auth
2. **Customize Prompts**: Create client-specific prompt templates
3. **Set Up Analytics**: Integrate with analytics platform
4. **Scale Infrastructure**: Upgrade Supabase and API plans as needed
5. **Add Features**: Implement real-time collaboration, advanced analytics

---

*Last Updated: January 2025*
*Version: 1.0.0*