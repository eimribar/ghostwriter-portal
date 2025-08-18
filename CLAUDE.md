# CLAUDE.md - Ghostwriter Portal Documentation

## Project Overview
**Ghostwriter Portal** - Admin dashboard for LinkedIn content generation and management. Part of a dual-portal system with the User Portal for client-facing interactions.

## Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 7.1.2
- **Styling**: Tailwind CSS with custom zinc/black/white design system
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI Integration**: 
  - Google Gemini 2.5 Pro API (1M+ tokens, Google Grounding enabled)
  - GPT-5 Responses API with Web Search (Real-time news, 2-5 min processing)
- **Deployment**: Vercel (with Serverless Functions)
- **Email**: Resend API for notifications
- **State Management**: React Context API
- **Background Processing**: Browser-based + Vercel Serverless Functions

## Project Structure
```
ghostwriter-portal/
├── api/                        # Vercel Serverless Functions
│   ├── process-search.js       # Processes GPT-5 background searches
│   ├── send-email.js          # Sends email notifications
│   ├── check-and-notify.js    # Checks and sends pending notifications
│   ├── slack-webhook.js       # Receives Slack events (NEW)
│   ├── slack-morning-sync.js  # Daily Slack sync automation (NEW)
│   ├── test-gpt5.js          # Test endpoint for GPT-5
│   └── test-simple.js        # Simple test for response structure
├── src/
│   ├── components/
│   │   ├── Navigation.tsx      # Sidebar navigation with Prompts link
│   │   ├── ProtectedRoute.tsx  # Auth protection
│   │   └── PortalSwitcher.tsx  # Navigate between portals
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client config
│   │   ├── api-config.ts      # API configurations
│   │   ├── llm-service.ts     # Gemini API integration
│   │   └── linkedin-prompts.ts # LinkedIn templates (4 styles)
│   ├── pages/
│   │   ├── Generate.tsx       # Content generation (no client required)
│   │   ├── Approval.tsx       # Content approval queue
│   │   ├── Prompts.tsx        # Prompt management system
│   │   ├── Ideation.tsx       # Content ideation with GPT-5 web search
│   │   ├── Schedule.tsx       # Post scheduling
│   │   ├── Clients.tsx        # Client management
│   │   ├── Analytics.tsx      # Performance metrics
│   │   └── SlackSettings.tsx  # Slack integration management (NEW)
│   ├── services/
│   │   ├── database.service.ts         # Database operations
│   │   ├── gpt5-responses.service.ts   # GPT-5 Responses API
│   │   ├── search-jobs.service.ts      # Background job management
│   │   ├── background-processor.service.ts # Client-side job processor
│   │   ├── email.service.ts           # Email service (browser-side)
│   │   ├── web-search.service.ts      # Web search API integrations
│   │   ├── slack.service.ts           # Slack API wrapper (NEW)
│   │   └── slack-sync.service.ts      # Slack sync orchestration (NEW)
│   └── App.tsx                # Main app component
├── Database Scripts/
│   ├── create_search_jobs_table.sql    # Background jobs table
│   ├── create_prompt_templates_table.sql # Prompt system schema
│   ├── populate_prompts.sql            # LinkedIn prompts data
│   ├── create_slack_tables.sql        # Slack integration schema (NEW)
│   └── FINAL_FIX_DATABASE.sql         # Database fixes
├── Documentation/
│   ├── CLAUDE.md              # This file - main documentation
│   ├── CHANGELOG.md           # Detailed change history
│   ├── VERCEL_ENV_VARS.md    # Environment variables setup guide
│   ├── BACKGROUND_SEARCH.md   # Background search feature docs
│   ├── TROUBLESHOOTING.md     # Common issues and solutions
│   └── SLACK_INTEGRATION.md   # Slack setup and usage guide (NEW)
├── .env.local                 # Local environment variables
├── .env.example              # Environment template
└── vercel.json               # Vercel configuration
```

## CRITICAL: Environment Variables Setup

### ⚠️ IMPORTANT: Vercel Serverless Functions Requirements
Vercel serverless functions **CANNOT** access `VITE_` prefixed variables. You must add BOTH versions:

#### Backend Variables (WITHOUT VITE_ prefix) - REQUIRED FOR API:
```bash
OPENAI_API_KEY=your_openai_key        # For GPT-5 API calls
SUPABASE_URL=your_supabase_url        # For database access
SUPABASE_ANON_KEY=your_supabase_key   # For database auth
RESEND_API_KEY=your_resend_key        # For email notifications
ADMIN_EMAIL=eimrib@yess.ai            # Where to send notifications
SLACK_SIGNING_SECRET=your_slack_secret # For Slack webhook verification
CRON_SECRET=your_cron_secret          # For cron job authentication
```

#### Frontend Variables (WITH VITE_ prefix) - For React App:
```bash
VITE_OPENAI_API_KEY=same_openai_key
VITE_SUPABASE_URL=same_supabase_url
VITE_SUPABASE_ANON_KEY=same_supabase_key
VITE_GOOGLE_API_KEY=your_google_key
VITE_RESEND_API_KEY=same_resend_key
VITE_ADMIN_EMAIL=eimrib@yess.ai
VITE_SLACK_SIGNING_SECRET=same_slack_secret
VITE_CRON_SECRET=same_cron_secret
VITE_ENV=production
```

**See VERCEL_ENV_VARS.md for complete setup instructions with actual values.**

## Key Features

### 1. Slack Integration (`/slack-settings`) - NEW ✨
- **Multi-Workspace Support**: Connect multiple Slack teams
- **Channel Monitoring**: Capture ideas from dedicated channels
- **Smart Parsing**: Automatically extract ideas from messages
- **Sync Options**: Daily, hourly, or real-time sync
- **Morning Automation**: Daily sync at 9 AM via Vercel Cron
- **User Attribution**: Track who submitted each idea
- **Auto-Approval**: Configure trusted channels
- **See SLACK_INTEGRATION.md for complete setup guide**

### 2. Content Generation (`/generate`)
- Uses Google Gemini 2.5 Pro API exclusively
- Max tokens: 1,048,576 (over 1 million tokens)
- Google Grounding: ENABLED by default for real-time information
- 4 LinkedIn prompt templates (RevOps, SaaStr, Sales Excellence, Data/Listicle)
- Temperature: 1.5 for creativity
- Auto-saves to database with status: 'draft'
- NO CLIENT SELECTION REQUIRED
- Supports hashtag extraction and read time estimation

### 2. Approval Queue (`/approval`)
- Lists all draft content (status: 'draft')
- Approve → Updates status to 'admin_approved'
- Reject → Updates status to 'admin_rejected' with reason
- Edit → In-line content editing with save
- Filter by status: all/draft/admin_approved/admin_rejected
- Content flows: draft → admin_approved → client_approved → scheduled/published

### 3. Content Ideation (`/ideation`) - GPT-5 Powered ✅ WORKING
- **News & Trends**: Real-time web search for trending topics
  - Uses GPT-5 Responses API (`/v1/responses` endpoint)
  - Enables `tools: [{ type: "web_search" }]` for real web search
  - Takes 2-5 minutes for comprehensive news search
  - Returns actual news with source URLs and dates
- **Background Processing**: 
  - Creates job in `search_jobs` table
  - Processes via Vercel serverless function
  - Sends email notification when complete
- **Manual Controls**:
  - "Check Emails" button to trigger pending notifications
  - Active jobs indicator shows running searches
- **NO MOCK DATA**: All searches are real, no fallback to mock

### 4. Prompt Management (`/prompts`)
- Full CRUD operations for AI prompts
- Categories: Content Generation, Content Ideation, Content Editing
- Search by name, description, or tags
- Duplicate prompts for variations
- Version history tracking
- Usage statistics and success rates

### 5. Portal Integration
- **Portal Switcher**: Bottom-right button to navigate to User Portal
- **Shared Database**: Both portals use same Supabase instance
- **URLs**:
  - Dev: http://localhost:5173 (Ghostwriter)
  - Dev: http://localhost:8080 (User)
  - Prod: https://ghostwriter-portal.vercel.app
  - Prod: https://unified-linkedin-project.vercel.app

## Database Schema

### Core Tables
- `content_ideas` - Content idea storage (updated with Slack fields)
- `generated_content` - Generated LinkedIn posts
- `scheduled_posts` - Scheduled publications
- `clients` - Client management
- `users` - User accounts
- `prompt_templates` - AI prompt templates
- `prompt_usage_history` - Prompt usage tracking
- `search_jobs` - Background search job queue

### Slack Tables (NEW)
- `slack_workspaces` - Workspace configurations and credentials
- `slack_channels` - Channel mappings and sync settings
- `slack_messages` - Raw message storage before processing
- `slack_sync_jobs` - Sync operation tracking and metrics

### search_jobs Table (Background Processing)
```sql
CREATE TABLE search_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query TEXT NOT NULL,
  search_params JSONB,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_count INTEGER,
  ideas_generated TEXT[],
  result_summary TEXT,
  processing_time_seconds INTEGER,
  error_message TEXT,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

## GPT-5 Responses API Integration

### Correct API Structure (FIXED August 15, 2025)
```javascript
// Endpoint
POST https://api.openai.com/v1/responses

// Request Body
{
  model: 'gpt-5',
  input: [{
    role: 'user',
    content: [{
      type: 'input_text',
      text: 'your prompt here'
    }]
  }],
  tools: [{ type: 'web_search' }],
  tool_choice: 'auto',
  reasoning: { effort: 'medium' },  // NOT reasoning_effort
  temperature: 1,
  max_output_tokens: 8192  // NOT max_completion_tokens
}

// Response Structure
{
  output: [
    { type: 'reasoning', ... },
    { 
      type: 'message',
      content: [{
        type: 'output_text',
        text: 'actual response text here'
      }]
    }
  ]
}
```

### Key Fixes Applied:
1. ✅ Parameter: `max_completion_tokens` → `max_output_tokens`
2. ✅ Response parsing: `output[1].content[0].text`
3. ✅ Environment variables: Added non-VITE versions for serverless

## API Endpoints (Vercel Serverless Functions)

### `/api/process-search`
- Processes background search jobs
- Calls GPT-5 with web search
- Saves results to database
- Sends email notifications

### `/api/send-email`
- Simple email sending endpoint
- Uses Resend API
- Sends to configured admin email

### `/api/check-and-notify`
- Checks for completed jobs
- Sends pending email notifications
- Can be triggered manually

## Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check
```

## Deployment Process

### Vercel Deployment
1. Push changes to GitHub main branch
2. Vercel auto-deploys on push
3. **CRITICAL**: Add environment variables in Vercel Dashboard (both VITE_ and non-VITE_ versions)
4. Settings → Environment Variables → Add all required vars
5. Redeploy after adding/updating environment variables

### Local Development
1. Copy `.env.example` to `.env.local`
2. Add your API keys and credentials
3. Run `npm run dev`
4. Access at http://localhost:5173

## Current System Status (August 18, 2025)

### ✅ FULLY WORKING FEATURES
- **Content Generation**: Gemini 2.5 Pro with 1M+ tokens
- **Approval Flow**: Complete admin → user approval process
- **Prompt Management**: Full CRUD with 4 LinkedIn templates
- **GPT-5 Web Search**: Real-time news search (2-5 min processing)
- **Background Processing**: Jobs queue with email notifications
- **Email Notifications**: Resend API integration
- **Portal Integration**: Seamless switching between admin/user portals
- **Slack Integration**: Multi-workspace support with automated sync (NEW)

### 🔧 Recent Updates (August 14-18, 2025)
1. **Fixed GPT-5 API Integration**:
   - Corrected environment variables (non-VITE for serverless)
   - Fixed parameter name: `max_output_tokens`
   - Proper response parsing from `output[1].content[0].text`

2. **Background Search Implementation**:
   - Created `search_jobs` table
   - Implemented job queue system
   - Added email notifications
   - Manual "Check Emails" button

3. **Improved UX**:
   - Confirmation modal for background searches
   - Active jobs indicator
   - Better error handling and logging

4. **Slack Integration (August 17, 2025)**:
   - Created comprehensive Slack API integration
   - Multi-workspace and channel management
   - Intelligent message parsing and idea extraction
   - Morning automation via Vercel Cron (9 AM daily)
   - Real-time webhook support for instant processing
   - Slack settings page for configuration
   - Updated Ideation page to display Slack-sourced ideas

5. **Major UI/UX Improvements (August 18, 2025)**:
   - **Complete Ideation Page Redesign**: Modern card grid layout with filter pills
   - **Fixed Slack System Messages**: Aggressive filtering to remove "has joined" type messages
   - **Database Prompt Management**: Full CRUD from UI, prompts immediately applied to generation
   - **URL Context Integration**: Auto-extracts URLs from content, always enabled with Google Grounding
   - **Simplified Generate Page**: Single input field, automatic URL detection
   - **Clean Visual Design**: Removed ugly accordions, added beautiful card-based layouts

## Testing Checklist
- [x] GPT-5 API calls work (check OpenAI logs)
- [x] Background search creates jobs
- [x] Jobs process successfully
- [x] Ideas save to database
- [x] Email notifications send
- [x] Ideas display in Ideation page
- [x] Manual email check works
- [x] Environment variables configured correctly

## Common Issues & Solutions

### Issue: GPT-5 not being called
**Solution**: Ensure non-VITE environment variables are set in Vercel

### Issue: Ideas not displaying
**Solution**: Check response parsing and database save logs

### Issue: Email not sending
**Solution**: Verify RESEND_API_KEY and ADMIN_EMAIL are set

For more troubleshooting, see TROUBLESHOOTING.md

## Contact & Support
- **GitHub**: https://github.com/eimribar/ghostwriter-portal
- **Admin Email**: eimrib@yess.ai
- **Primary Use Case**: LinkedIn content generation for agencies

## Next Steps & Roadmap

### Immediate Next Steps (Priority for Tomorrow):
1. **Test Complete Workflow**:
   - Test content idea flow from ChatGPT → Ideation → Generate → Approval
   - Verify URL auto-extraction works with real ChatGPT outputs
   - Ensure Slack integration captures real ideas properly

2. **Database Cleanup**:
   - Run `cleanup_junk_ideas.sql` in Supabase to remove system messages
   - Verify all Slack system messages are filtered

3. **Prompt Optimization**:
   - Create more custom prompts in database
   - Test different prompt variations for quality
   - Fine-tune temperature settings

### Future Enhancements:
- [ ] Add bulk approval functionality
- [ ] Create content calendar view
- [ ] Implement real LinkedIn publishing via API
- [ ] Add team collaboration features
- [ ] Create analytics dashboard
- [ ] Add A/B testing for content variations
- [ ] Integrate with LinkedIn Analytics API
- [ ] Add content performance tracking