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
- **Deployment**: Vercel
- **State Management**: React Context API

## Project Structure
```
ghostwriter-portal/
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
│   │   └── Analytics.tsx      # Performance metrics
│   ├── services/
│   │   ├── database.service.ts # Database operations + promptTemplatesService
│   │   ├── gpt5-responses.service.ts # GPT-5 Responses API with web search
│   │   └── web-search.service.ts # Web search API integrations
│   └── App.tsx                # Main app component
├── create_prompt_templates_table.sql  # Prompt system database schema
├── populate_prompts.sql       # Actual LinkedIn prompts data
├── FINAL_FIX_DATABASE.sql     # Database fixes for approval flow
├── CHANGELOG.md               # Detailed change history
├── .env.local                 # Local environment variables
├── .env.example              # Environment template
└── vercel.json               # Vercel configuration
```

## Environment Variables

### Required for Production (Set in Vercel Dashboard)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://ifwscuvbtdokljwwbvex.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Gemini API
VITE_GOOGLE_API_KEY=your_google_api_key_here

# GPT-5 Configuration (REQUIRED for Ideation)
VITE_OPENAI_API_KEY=your_openai_api_key_here  # GPT-5 access required
VITE_GPT5_MODEL=gpt-5                         # Model name (default: gpt-5)

# Optional APIs
VITE_ANTHROPIC_API_KEY=        # For Claude integration
VITE_APIFY_API_KEY=            # For LinkedIn scraping
VITE_GOOGLE_SEARCH_API_KEY=    # For web search fallback
VITE_BING_SEARCH_API_KEY=      # For web search fallback
VITE_SERPAPI_KEY=              # For web search fallback
```

## Key Features

### 1. Content Generation (`/generate`)
- Uses Google Gemini 2.5 Pro API exclusively
- Max tokens: 1,048,576 (over 1 million tokens)
- Google Grounding: ENABLED by default for real-time information
- 4 LinkedIn prompt templates (RevOps, SaaStr, Sales Excellence, Data/Listicle)
- Temperature: 1.5 for creativity
- Auto-saves to database with status: 'draft'
- NO CLIENT SELECTION REQUIRED - bypasses content_ideas table
- Supports hashtag extraction and read time estimation
- Saves with client_id, idea_id, user_id as undefined

### 2. Approval Queue (`/approval`)
- Lists all draft content (status: 'draft')
- Approve → Updates status to 'admin_approved'
- Reject → Updates status to 'admin_rejected' with reason
- Edit → In-line content editing with save
- Filter by status: all/draft/admin_approved/admin_rejected
- Content flows: draft → admin_approved → client_approved → scheduled/published

### 3. Content Ideation (`/ideation`) - GPT-5 Powered
- **News & Trends**: Real-time web search for trending topics
  - Uses GPT-5 Responses API (`/v1/responses` endpoint)
  - Enables `tools: [{ type: "web_search" }]` for real web search
  - Takes 2-5 minutes for comprehensive news search
  - Returns actual news with source URLs and dates
- **AI Generation**: Generate ideas from any topic
  - Multiple modes: Comprehensive, Quick, Trend-focused, News-focused
  - Industry and audience targeting
  - Engagement scoring and optimization
- **NO MOCK DATA**: All searches are real, no fallback to mock
- **Fixed Query**: "find me the top 10 trending topics (news) with context related to b2b saas, ai and marketing. actual news from the past week"

### 4. Portal Integration
- **Portal Switcher**: Bottom-right button to navigate to User Portal
- **Shared Database**: Both portals use same Supabase instance
- **URLs**:
  - Dev: http://localhost:5173 (Ghostwriter)
  - Dev: http://localhost:8080 (User)
  - Prod: https://ghostwriter-portal.vercel.app
  - Prod: https://unified-linkedin-project.vercel.app

## Database Setup

### Required Tables
The application requires these tables to be created in Supabase. Run the migration scripts in the following order if any are missing:
1. `supabase_migration.sql` - Creates core tables
2. `fix_rls_policies.sql` - Sets up Row Level Security
3. `fix_status_constraint.sql` - Fixes status enum values

### 5. Prompt Management (`/prompts`)
- Full CRUD operations for AI prompts
- Categories: Content Generation, Content Ideation, Content Editing
- Search by name, description, or tags
- Duplicate prompts for variations
- Version history tracking
- Usage statistics and success rates
- Settings: temperature, max_tokens, top_p
- Provider support: Google, OpenAI, Anthropic

### Key Tables
```sql
-- Content Ideas
content_ideas (
  id, client_id, user_id, title, description, 
  source, priority, status, created_at, updated_at
)

-- Generated Content
generated_content (
  id, idea_id, client_id, ghostwriter_id, variant_number,
  content_text, hook, hashtags[], estimated_read_time,
  llm_provider, llm_model, generation_prompt,
  status, approved_at, approved_by, rejection_reason,
  created_at, updated_at
)

-- Scheduled Posts
scheduled_posts (
  id, content_id, client_id, scheduled_for,
  platform, status, published_at, error_message,
  created_at, updated_at
)

-- Clients
clients (
  id, company_name, contact_name, contact_email,
  industry, created_at, updated_at
)

-- Users
users (
  id, email, full_name, role,
  created_at, updated_at
)

-- Prompt Templates
prompt_templates (
  id, name, category, description, system_message,
  examples, variables, settings, provider, model,
  tags[], is_active, is_default, version, parent_id,
  usage_count, success_rate, created_by,
  created_at, updated_at
)

-- Prompt Usage History
prompt_usage_history (
  id, prompt_template_id, used_by, input_data,
  output_data, feedback, rating, created_at
)
```

## LinkedIn Prompt Templates

### 1. RevOps Perspective
- Voice: Direct, data-driven, practical
- Avoid: Jargon, fluff, theory without application
- Focus: Metrics, efficiency, real problems

### 2. SaaStr Style
- Voice: Bold, controversial, experience-based
- Avoid: Everyone agrees statements, hedging
- Focus: Hard truths, specific examples

### 3. Sales Excellence
- Voice: Strategic, consultative, value-focused
- Avoid: Pushy tactics, feature-dumping
- Focus: Buyer psychology, trust-building

### 4. Data/Listicle
- Voice: Structured, evidence-based, scannable
- Avoid: Walls of text, unsupported claims
- Focus: Numbered insights, clear takeaways

## API Integration

### Gemini Configuration
```typescript
const requestBody = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    temperature: 1.5,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 65536,
  },
  systemInstruction: { parts: [{ text: systemMessage }] }
};
```

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
3. Environment variables must be set in Vercel Dashboard
4. Settings → Environment Variables → Add all required vars
5. Redeploy after adding/updating environment variables

### Local Development
1. Copy `.env.example` to `.env.local`
2. Add your API keys and credentials
3. Run `npm run dev`
4. Access at http://localhost:5173

## Security Best Practices
- **NEVER** commit API keys to Git
- All sensitive data in `.env.local` (gitignored)
- Use environment variables for all credentials
- API keys should have restrictions:
  - HTTP referrer restrictions
  - API-specific restrictions
  - IP restrictions where possible

## Common Issues & Solutions

### Issue: Blank page on production
**Solution**: Add environment variables in Vercel Dashboard

### Issue: Mock data instead of real AI content
**Solution**: Ensure VITE_GOOGLE_API_KEY is set correctly

### Issue: Posts not appearing in approval queue / not saving
**Solution**: 
1. Check Supabase credentials are correct
2. Ensure `generated_content` table exists - run `supabase_migration.sql`
3. Fix RLS policies - run `fix_rls_policies.sql`
4. Fix status constraints - run `FINAL_FIX_DATABASE.sql`
5. Run `populate_prompts.sql` to add actual prompts
6. Status should be 'draft' not 'pending'
7. See DATABASE_SETUP.md for complete instructions

### Issue: "Variable already exists" error in Vercel
**Solution**: Delete duplicate environment variable

### Issue: "relation does not exist" error
**Solution**: The `generated_content` table is missing. Run the migration scripts in order:
1. `supabase_migration.sql`
2. `fix_rls_policies.sql`
3. `fix_status_constraint.sql`

## Recent Updates (December 2024)

### December 14, 2024
- **Prompt Management System**: Complete CRUD interface for managing all AI prompts
- **Approval Flow Fixed**: Removed client dependency, content saves without client selection
- **User Portal Cleanup**: Removed ALL mock data (Amnon Cohen, mock posts)
- **Database Improvements**: Made fields optional, fixed status enums
- **4 LinkedIn Prompts**: Fully populated with actual content from linkedin-prompts.ts
- **Google Grounding Added**: Real-time web search for factual accuracy (always on)
- **Token Limit Increased**: From 1,000 to 1,048,576 tokens (1M+)
- **Prompt Update Debugging**: Added extensive logging and force refresh

### Security Fixes
- Removed all hardcoded API keys from codebase
- Deleted test files containing exposed credentials
- Updated to use environment variables exclusively

### Portal Integration
- Added PortalSwitcher component
- Synchronized Supabase database between portals
- Implemented shared authentication context

### UI/UX Improvements
- Unified zinc/black/white design system
- Fixed invisible gradient components
- Simplified content generation interface
- Added auto-save functionality

## Contact & Support
- **GitHub**: https://github.com/eimribar/ghostwriter-portal
- **User Portal**: https://github.com/eimribar/unified-linkedin-project
- **Primary Use Case**: LinkedIn content generation and management for agencies

## Current System Status (December 14, 2024)

### ✅ WORKING: Complete Two-Portal System

#### Portal URLs
- **Admin Portal**: https://ghostwriter-portal.vercel.app
- **User Portal**: https://unified-linkedin-project.vercel.app

#### Approval Flow (Fully Functional)
1. **Admin Portal**: Generate content (4 variations) → Status: 'draft'
2. **Admin Portal**: Review & Approve → Status: 'admin_approved'
3. **User Portal**: Shows admin-approved content automatically
4. **User Portal**: Client approves → Status: 'client_approved'
5. **System**: Auto-schedules for next day publication

#### Key Features Working
- ✅ Gemini 2.5 Pro with 1M+ tokens
- ✅ Google Grounding enabled by default
- ✅ Prompt management system
- ✅ Portal-to-portal data flow
- ✅ No authentication required (simplified for testing)
- ✅ All pages accessible without login

## Testing Checklist
- [x] Content generation creates 4 unique variations
- [x] Posts save to database with 'draft' status
- [x] Approval queue shows all draft posts
- [x] Approve button updates to 'admin_approved' status
- [x] Admin-approved content appears in User Portal
- [x] User Portal works without authentication
- [x] All pages load without errors
- [x] Single navbar in User Portal
- [x] Portal switcher navigates correctly
- [x] Environment variables load properly
- [x] No API keys in source code
- [x] Build succeeds without TypeScript errors
- [x] Prompt management system fully functional
- [x] All mock data removed from User Portal

## Recent Updates (August 2025)

### August 14, 2025 - GPT-5 Web Search Integration
- **GPT-5 Responses API**: Implemented `/v1/responses` endpoint with web search
- **Real Web Search**: `tools: [{ type: "web_search" }]` for actual news
- **NO MOCK DATA**: Removed all mock functions, only real API calls
- **Processing Time**: 2-5 minutes for comprehensive web search
- **Proven Results**: Successfully retrieved real news (Oracle/Google deal, $9B Oklahoma investment, etc.)
- **Fixed Parameters**: `reasoning.effort` instead of `reasoning_effort`
- **Content Ideation**: Full implementation at `/ideation` with News & Trends

## Next Steps & Roadmap

### ✅ COMPLETED: Content Ideation System
- [x] **GPT-5 Web Search Integration**
  - [x] Real-time news search from web
  - [x] Trend analysis with actual data
  - [x] Multiple idea generation modes
  - [x] Source URLs and publication dates
  - [x] Engagement scoring

### Future Enhancements
- [ ] Add bulk approval functionality
- [ ] Create content calendar view
- [ ] Implement real LinkedIn publishing via API
- [ ] Add team collaboration features
- [ ] Create Content Editing prompts
- [ ] Add prompt performance analytics
- [ ] Re-enable authentication with proper user management
- [ ] Add client-specific filtering
- [ ] Implement notification system