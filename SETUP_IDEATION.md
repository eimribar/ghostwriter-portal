# Setup Instructions for GPT-5 Content Ideation

## Quick Setup Guide

### Step 1: Create the Database Table

1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `ifwscuvbtdokljwwbvex`
3. Go to **SQL Editor** (left sidebar)
4. Create a new query and paste the contents of `create_content_ideas_table.sql`
5. Click **Run** to execute the SQL

✅ **Verification**: After running, go to **Table Editor** and confirm you see:
- `content_ideas` table with sample data (3 rows)
- `active_content_ideas` view
- `content_ideas_analytics` materialized view

### Step 2: Configure API Keys

#### REQUIRED: Real GPT-5 Configuration (NO MOCK DATA)
**Important**: The system no longer supports mock data. You MUST configure a real OpenAI API key.
1. Create/update `.env.local` file in the project root:
```bash
# Required for real GPT-5 generation
VITE_OPENAI_API_KEY=sk-...your-openai-api-key...

# Model configuration
VITE_GPT5_MODEL=gpt-5              # Default: gpt-5 (DO NOT CHANGE)
```

2. Get your OpenAI API key from: https://platform.openai.com/api-keys

### Step 3: Start the Application

```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser

### Step 4: Test the Ideation Flow

1. Navigate to **Ideation** page from the sidebar
2. Click **"Generate AI Ideas"** button
3. Enter a topic (e.g., "AI in healthcare", "remote work productivity")
4. Configure options:
   - **Generation Mode**: Comprehensive (high quality) / Quick / Trend Focused
   - **Number of Ideas**: 3, 5, or 10
   - **Industry**: Technology, Healthcare, etc.
   - **Target Audience**: B2B professionals, Startup founders, etc.
5. Click **Generate Ideas**

### Expected Results

#### With Mock Data (No API Key):
- Instantly generates sample ideas
- Ideas are saved to database
- Shows engagement scores and categories
- All features work except real AI generation

#### With Real GPT-5 (API Key Configured):
- Takes 5-10 seconds to generate
- Creates unique, contextual ideas based on your topic
- Uses GPT-5's reasoning and tool functions
- Analyzes trends and competitors (simulated)
- Provides engagement predictions

## Features Overview

### Content Idea Management
- **Sources**: AI-generated, trending, manual, content-lake, competitor
- **Statuses**: draft → ready → in-progress → used → archived
- **Priority Levels**: High, Medium, Low
- **Scoring**: AI-predicted engagement scores (0-10)

### AI Generation Modes
1. **Comprehensive**: Deep analysis with trend research
2. **Quick**: Fast generation with proven formats
3. **Trend Focused**: Based on current LinkedIn trends

### Tool Functions (GPT-5)
- `get_trending_topics`: Analyzes current trends
- `analyze_competitor_content`: Studies top-performing content
- `expand_idea`: Develops ideas into full content plans
- `generate_hooks`: Creates viral hooks
- `predict_engagement`: Scores engagement potential

## Database Schema

### Key Fields in `content_ideas` Table
- `title`: Main idea headline
- `description`: Detailed description
- `hook`: Attention-grabbing opening
- `key_points`: Array of main talking points
- `target_audience`: Who this content is for
- `content_format`: thought-leadership, how-to, case-study, etc.
- `score`: AI quality/engagement score (0-10)
- `ai_model`: Which model generated (gpt-5, gemini, etc.)
- `ai_reasoning_effort`: GPT-5 reasoning level used
- `hashtags`: Suggested LinkedIn hashtags

## Troubleshooting

### Issue: "Failed to load content ideas"
**Solution**: 
1. Check Supabase connection in `.env.local`
2. Verify `content_ideas` table exists
3. Check browser console for specific errors

### Issue: "Failed to generate AI ideas"
**Solution**:
1. If using API key, verify it's valid
2. Check OpenAI account has credits
3. Try with mock data first (remove API key)

### Issue: Ideas not saving to database
**Solution**:
1. Check Supabase RLS policies are enabled
2. Verify authentication is working
3. Check browser network tab for API errors

### Issue: Blank Ideation page
**Solution**:
1. Run `npm run dev` and check for TypeScript errors
2. Verify all imports are correct
3. Check browser console for errors

## Testing Checklist

- [ ] Database table created successfully
- [ ] Sample data visible in table
- [ ] Ideation page loads without errors
- [ ] Mock idea generation works (no API key)
- [ ] Ideas save to database
- [ ] Search/filter functionality works
- [ ] Idea details modal opens
- [ ] Priority and status badges display correctly
- [ ] (Optional) Real GPT-5 generation works with API key

## Next Steps

Once the ideation system is working:

1. **Test Different Topics**: Try various industries and audiences
2. **Experiment with Modes**: Compare comprehensive vs quick generation
3. **Review Generated Ideas**: Check quality and relevance
4. **Use Ideas for Content**: Click "Generate" on ideas to create posts
5. **Track Performance**: Monitor which ideas perform best

## API Usage & Costs

### Mock Data (Free)
- Unlimited idea generation
- No API costs
- Perfect for testing and development

### GPT-5 API (When Available)
- Pricing: TBD by OpenAI
- Estimated: ~$0.01-0.05 per idea generation
- Tool calls may incur additional costs
- Monitor usage in OpenAI dashboard

## Support

If you encounter issues:
1. Check this guide first
2. Review error messages in browser console
3. Verify all setup steps were completed
4. Check `.env.local` for correct API keys
5. Ensure database migrations ran successfully