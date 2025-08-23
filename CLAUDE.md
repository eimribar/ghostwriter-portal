# CLAUDE.md - Ghostwriter Portal Documentation

## Project Overview
**Ghostwriter Portal** - Admin dashboard for LinkedIn content generation and management. Part of a dual-portal system with the User Portal for client-facing interactions.

**MAJOR UPDATE (August 23, 2025)**: Complete workflow reorganization with client isolation, separate approval stages, and archive system.

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
│   │   └── llm-service.ts     # Database-driven AI service (NO hardcoded prompts)
│   ├── pages/
│   │   ├── Generate.tsx         # Content generation (client-aware)
│   │   ├── Approval.tsx         # Admin approval for drafts only
│   │   ├── ClientFeedback.tsx   # Handle client responses (NEW)
│   │   ├── ContentCalendar.tsx  # Schedule and track content (NEW)
│   │   ├── Prompts.tsx          # Complete prompt management system
│   │   ├── Ideation.tsx         # Content ideation with GPT-5 web search
│   │   ├── Schedule.tsx         # Post scheduling
│   │   ├── Clients.tsx          # Client management
│   │   ├── Analytics.tsx        # Performance metrics
│   │   └── SlackSettings.tsx    # Slack integration management
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
│   ├── create_slack_tables.sql        # Slack integration schema
│   ├── create_notifications_system.sql # Notification system (NEW)
│   ├── add_archive_and_scheduling_fields.sql # Archive & scheduling (NEW)
│   ├── run_this_in_supabase_FIXED.sql # Fixed notification setup (NEW)
│   ├── fix_notifications_trigger.sql   # Trigger fixes (NEW)
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

### 🚀 NEW: Three-Page Approval Workflow (August 23, 2025)

#### **1. Admin Approval** (`/approval`) 
**Purpose**: Review newly generated content before sending to clients
- **Shows Only**: Draft and admin-rejected content
- **Client Isolation**: Filters by active client automatically
- **Clean Stats**: Pending review, needs revision, unassigned counts
- **Actions**: 
  - Approve → Sends to client (status: `admin_approved`)
  - Reject → Returns for revision (status: `admin_rejected`)
  - Edit → In-line content editing
  - Assign Client → For unassigned content

#### **2. Client Feedback** (`/client-feedback`) - NEW ✨
**Purpose**: Handle all client responses in one dedicated space
- **Shows Only**: Content with client actions (approved/rejected/edited)
- **Three Sections**:
  - 🟢 **Client Approved** → Schedule to calendar or Archive
  - 🔴 **Client Rejected** → Edit & Resend to client or Archive (shows rejection reason)
  - 🟡 **Client Edited** → Review changes and approve or send back
- **Client Isolation**: Only shows feedback for active client
- **Archive System**: Clean up dashboard by archiving handled content
- **Auto-refresh**: Every 30 seconds to catch new responses

#### **3. Content Calendar** (`/calendar`) - NEW ✨
**Purpose**: Schedule and track approved content publication
- **Three Views**:
  - 📋 **Ready to Schedule**: Client-approved content awaiting scheduling
  - 📅 **Scheduled**: Content with scheduled publication dates
  - ✅ **Posted**: Published content with post URLs
- **Grid Layout**: Visual calendar cards for easy management
- **Actions**:
  - Schedule with date/time picker
  - Mark as posted with optional URL
  - Archive completed content
- **Publication Tracking**: Track scheduling, posting dates, and URLs

### **Client Isolation System** - MAJOR ENHANCEMENT ✨
- **Complete Separation**: Each client's content stays completely separate
- **Client Switcher**: Select active client in navigation sidebar
- **Filtered Views**: All pages respect the selected client
- **Visual Indicators**: Clear display of which client you're viewing
- **Badge Counts**: Navigation badges update based on active client

### **Archive System** - NEW ✨
- **Clean Dashboard**: Archive completed, rejected, or outdated content
- **Database Fields**: `archived`, `archived_at`, `archived_reason`
- **Smart Filtering**: Archived content excluded from all active views
- **Retention**: Content not deleted, just hidden for clean interface

### 1. Slack Integration (`/slack-settings`)
- **Multi-Workspace Support**: Connect multiple Slack teams
- **Channel Monitoring**: Capture ideas from dedicated channels
- **Smart Parsing**: Automatically extract ideas from messages
- **Sync Options**: Daily, hourly, or real-time sync
- **Morning Automation**: Daily sync at 9 AM via Vercel Cron
- **User Attribution**: Track who submitted each idea
- **Auto-Approval**: Configure trusted channels
- **See SLACK_INTEGRATION.md for complete setup guide**

### 2. Enhanced Content Generation (`/generate`) - MAJOR UPGRADE ✨
- **🎯 Database-Driven Prompts**: Uses ONLY prompts from database (no hardcoded templates)
- **🎛️ Dynamic Variations**: Choose 1-10 variations instead of fixed 4
- **🎨 Variation Strategies**: 
  - Same prompt with temperature variations
  - Different prompts from Content Generation category  
  - Mixed category prompts (coming soon)
- **🔍 Prompt Preview**: Show/hide prompt details directly in Generate page
- **⚙️ Multi-Provider Support**: Google Gemini 2.5 Pro, OpenAI, Anthropic
- **🌐 Google Grounding**: ENABLED by default for real-time information
- **💾 Auto-saves to database** with status: 'draft'
- **📈 Enhanced Settings**: Custom temperature, max tokens per prompt
- **🔗 URL Auto-extraction**: Automatically detects and analyzes URLs in content
- **⚡ Fail-Fast Approach**: Clear errors when no prompts exist (guides user to create prompts)

### 3. Approval Queue (`/approval`)
- Lists all draft content (status: 'draft')
- Approve → Updates status to 'admin_approved'
- Reject → Updates status to 'admin_rejected' with reason
- Edit → In-line content editing with save
- Filter by status: all/draft/admin_approved/admin_rejected
- Content flows: draft → admin_approved → client_approved → scheduled/published

### 4. Content Ideation (`/ideation`) - GPT-5 Powered ✅ WORKING
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

### 5. Advanced Prompt Management (`/prompts`) - COMPLETELY OVERHAULED ✨
- **🚫 NO MORE HARDCODED PROMPTS**: All prompts are database-driven
- **🧪 Live Prompt Testing**: Test any prompt with real API calls before using
- **⚡ Bulk Operations**: Select/activate/duplicate/delete multiple prompts at once
- **📥📤 Import/Export**: Backup and share prompts as JSON files
- **🎛️ Dynamic Variations**: Generate 1-10 content variations with different strategies
- **🏷️ Enhanced Filtering**: Search by name, description, tags, or category
- **🔧 Full CRUD Operations**: Create, read, update, delete prompts from UI
- **📊 Performance Tracking**: Usage statistics, success rates, and response times
- **⭐ Favorites System**: Mark frequently used prompts for quick access
- **🎨 Visual Management**: Modern card-based interface with bulk selection
- **Categories**: Content Generation, Content Ideation, Content Editing
- **Multi-Provider Support**: Google Gemini, OpenAI, Anthropic

### 6. Portal Integration
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
- `generated_content` - Generated LinkedIn posts (ENHANCED with archive & scheduling fields)
- `scheduled_posts` - Scheduled publications
- `clients` - Client management (multi-tenant support)
- `users` - User accounts
- `prompt_templates` - AI prompt templates (ENHANCED with new fields)
- `prompt_usage_history` - Prompt usage tracking  
- `prompt_test_results` - Test results and performance tracking
- `prompt_collections` - Organize prompts into themed collections
- `prompt_collection_items` - Junction table for collections
- `search_jobs` - Background search job queue
- `notifications` - Client action notifications (NEW)
- `client_activity_log` - Audit trail for client actions (NEW)
- `admin_sessions` - Multi-user session management (NEW)

### Enhanced generated_content Schema (NEW FIELDS)
The `generated_content` table now includes:
- `archived` - Boolean flag for archived content
- `archived_at` - Timestamp when archived
- `archived_reason` - Reason for archiving
- `posted_at` - Timestamp when content was posted
- `scheduled_for` - Scheduled publication datetime
- `post_url` - URL of published post
- `client_id` - Foreign key for client isolation (ENHANCED)

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

### Enhanced Prompt Templates Schema (NEW FIELDS)
The `prompt_templates` table now includes:
- `output_format` - Expected output format (paragraph, list, bullets, json, markdown)
- `tone_preset` - Tone preset (professional, casual, technical, inspirational, friendly) 
- `length_preset` - Length preset (short, medium, long, custom)
- `is_favorite` - Mark frequently used prompts
- `last_tested_at` - When prompt was last tested
- `average_response_time` - Performance tracking in milliseconds

### prompt_test_results Table (NEW)
```sql
CREATE TABLE prompt_test_results (
  id UUID PRIMARY KEY,
  prompt_template_id UUID REFERENCES prompt_templates(id),
  test_input TEXT NOT NULL,
  test_output TEXT NOT NULL,
  response_time_ms INTEGER,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  tested_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Prompt Collections System (NEW)
- `prompt_collections` - Organize prompts into themed groups
- `prompt_collection_items` - Junction table linking prompts to collections
- Pre-loaded "LinkedIn Content Templates" collection with 4 LinkedIn prompts

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

## Current System Status (August 23, 2025) - COMPLETE WORKFLOW REORGANIZATION

### ✅ FULLY WORKING FEATURES - MAJOR UPDATE
- **🎯 Three-Page Approval Workflow**: Complete separation of admin approval, client feedback, and scheduling
- **👥 Client Isolation System**: Full multi-tenant support with client-specific views
- **📋 Archive System**: Clean dashboard management with archiving capability
- **🗓️ Content Calendar**: Schedule, track, and manage publication status
- **🎯 Enhanced Content Generation**: Database-driven prompts with 1-10 dynamic variations
- **🧪 Advanced Prompt Management**: Live testing, bulk operations, import/export, no hardcoded prompts
- **✅ Complete Approval Flow**: Admin → Client → Schedule → Publish workflow
- **📊 Performance Tracking**: Test results, usage statistics, response times
- **GPT-5 Web Search**: Real-time news search (2-5 min processing)
- **Background Processing**: Jobs queue with email notifications
- **Email Notifications**: Resend API integration
- **Portal Integration**: Seamless switching between admin/user portals
- **Slack Integration**: Multi-workspace support with automated sync

### 🔧 Recent Updates (August 14-23, 2025)

#### 🚀 COMPLETE WORKFLOW REORGANIZATION (August 23, 2025)
1. **📄 Three-Page Approval System**:
   - Split single approval page into three focused pages
   - Admin Approval: Only drafts and admin-rejected content
   - Client Feedback: Handle all client responses (approved/rejected/edited)
   - Content Calendar: Schedule and track publication status

2. **👥 Client Isolation Implementation**:
   - Complete separation of client content across all pages
   - Client switcher affects all page views and counts
   - Visual indicators showing active client context
   - Navigation badges update based on selected client

3. **📋 Archive System**:
   - New database fields: `archived`, `archived_at`, `archived_reason`
   - Clean dashboard by archiving completed content
   - Smart filtering excludes archived content from active views
   - Content preservation without deletion

4. **🗓️ Content Calendar & Scheduling**:
   - New database fields: `posted_at`, `scheduled_for`, `post_url`
   - Three-view calendar: Ready/Scheduled/Posted
   - Visual grid layout for content management
   - Track complete publication lifecycle

5. **🔧 Database Enhancements**:
   - Archive and scheduling fields added to generated_content
   - Notification system tables created
   - Trigger fixes for error-free client actions
   - Enhanced client isolation with proper foreign keys

#### 🎆 PREVIOUS SYSTEM OVERHAUL (August 14-20, 2025)
1. **❌ Removed ALL Hardcoded Prompts**:
   - Deleted `linkedin-prompts.ts` file (810 lines removed)
   - Made database prompts the ONLY source of truth
   - No more fallback to hardcoded templates

2. **🧪 Live Prompt Testing System**:
   - Test any prompt with real API calls
   - Real-time response preview
   - Performance tracking (response time, quality rating)
   - Copy outputs or save as new prompts

3. **⚡ Bulk Operations for Prompts**:
   - Multi-select prompts with checkboxes
   - Bulk activate/deactivate/duplicate/delete
   - Visual feedback for selected prompts
   - "Select All" and "Clear Selection" options

4. **📥📤 Import/Export Functionality**:
   - Export prompts as JSON for backup
   - Import prompts from JSON files
   - Share prompt libraries between instances

5. **🎛️ Enhanced Generate Page**:
   - Choose 1-10 variations (was fixed at 4)
   - Multiple variation strategies
   - Dynamic prompt selection from database
   - Better error handling with user guidance

6. **📋 Database Enhancements**:
   - New fields: `output_format`, `tone_preset`, `length_preset`, `is_favorite`
   - `prompt_test_results` table for tracking test performance
   - `prompt_collections` system for organizing prompts
   - Pre-loaded 4 LinkedIn templates from hardcoded data

#### Previous Updates
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

## Testing Checklist (Updated August 23, 2025)

### Core Workflow ✅
- [x] Content generation with client assignment
- [x] Admin approval workflow (approve/reject/edit)
- [x] Client portal actions (approve/reject/edit)
- [x] Client feedback page displays responses
- [x] Archive system removes content from active views
- [x] Content calendar scheduling and tracking

### Client Isolation ✅
- [x] Client switcher affects all page views
- [x] Navigation badges update per client
- [x] Content filtered by active client
- [x] No cross-client content bleeding

### Database Integration ✅
- [x] Archive fields working (archived, archived_at, archived_reason)
- [x] Scheduling fields working (scheduled_for, posted_at, post_url)
- [x] Client isolation via client_id foreign keys
- [x] Notification system tables created

### Portal Integration ✅
- [x] Admin portal three-page workflow
- [x] Client portal approval actions
- [x] Seamless switching between portals
- [x] Real-time data sync

### Previous Features ✅
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