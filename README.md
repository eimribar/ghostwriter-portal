# Ghostwriter Portal - LinkedIn Content Management System

> **Latest Update (August 23, 2025)**: Complete workflow reorganization with client isolation, three-page approval system, and archive management.

A comprehensive dual-portal system for LinkedIn content generation and management, featuring AI-powered content creation, client approval workflows, and publication scheduling.

## 🚀 Key Features

### **Three-Page Approval Workflow** ✨
- **Admin Approval**: Review drafts before sending to clients
- **Client Feedback**: Handle all client responses (approved/rejected/edited)
- **Content Calendar**: Schedule and track publication status

### **Client Isolation System** ✨
- Complete multi-tenant support with client-specific views
- Client switcher affects all pages and navigation badges
- Separate content management for each client

### **Archive & Scheduling** ✨
- Archive completed content for clean dashboard management
- Schedule content with date/time picker
- Track publication status with URLs

### **Advanced AI Integration**
- Database-driven prompt management (no hardcoded prompts)
- GPT-5 Responses API with real-time web search
- Google Gemini 2.5 Pro with Google Grounding
- Live prompt testing and bulk operations

## 🏗️ System Architecture

### **Dual Portal System**
- **Admin Portal** (localhost:5173): Content creation and management
- **Client Portal** (localhost:8080): Client approval interface
- Seamless portal switching and shared database

### **Complete Workflow**
```
Generate → Admin Approval → Client Review → Client Feedback → Calendar → Archive
```

## 📋 Quick Start

### 1. **Database Setup**
Run these SQL scripts in Supabase SQL Editor:
```sql
-- Core system
run_this_in_supabase_FIXED.sql

-- Archive and scheduling
add_archive_and_scheduling_fields.sql

-- Fix any notification issues
fix_notifications_trigger.sql
```

### 2. **Environment Variables**
Create `.env.local` with:
```bash
# Frontend (VITE_ prefix)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_GOOGLE_API_KEY=your_google_key

# Backend (no prefix - for Vercel functions)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key
ADMIN_EMAIL=your_email@example.com
```

### 3. **Install & Run**
```bash
npm install
npm run dev
```

### 4. **Setup Clients**
1. Go to `/clients` and create client profiles
2. Use client switcher to select active client
3. Generate content assigned to that client

## 📊 Page Structure

### **Admin Portal Pages**
- **Generate** (`/generate`) - AI content creation with client assignment
- **Admin Approval** (`/approval`) - Review drafts and admin-rejected content
- **Client Feedback** (`/client-feedback`) - Handle client responses
- **Content Calendar** (`/calendar`) - Schedule and track publications
- **Prompts** (`/prompts`) - Database-driven prompt management
- **Ideation** (`/ideation`) - GPT-5 powered content ideas
- **Clients** (`/clients`) - Client profile management
- **Slack Settings** (`/slack-settings`) - Slack integration

### **Client Portal Pages**
- **Client Login** - PIN-based authentication
- **Client Approval** - Approve/reject/edit content interface

## 🗄️ Database Schema

### **Core Tables**
- `generated_content` - Posts with archive/scheduling fields
- `clients` - Client profiles with isolation support
- `notifications` - Client action notifications
- `client_activity_log` - Audit trail
- `prompt_templates` - Database-driven prompts

### **New Fields (August 23, 2025)**
```sql
-- Archive system
archived BOOLEAN DEFAULT false
archived_at TIMESTAMPTZ
archived_reason TEXT

-- Scheduling system  
posted_at TIMESTAMPTZ
scheduled_for TIMESTAMPTZ
post_url TEXT
```

## 🔄 Complete Workflow Example

### **1. Content Creation**
```
Admin generates content → Assigns to client → Status: 'draft'
```

### **2. Admin Review**
```
Admin Approval page → Review → Approve → Status: 'admin_approved'
```

### **3. Client Review**
```
Client Portal → Review content → Approve/Reject/Edit → Status: 'client_approved'
```

### **4. Handle Feedback**
```
Client Feedback page → Schedule or Archive → Calendar tracking
```

### **5. Publication**
```
Content Calendar → Schedule date → Mark as posted → Archive
```

## 🛠️ Development

### **Tech Stack**
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: GPT-5 Responses, Google Gemini 2.5 Pro
- **Deployment**: Vercel
- **Background Jobs**: Vercel Serverless Functions

### **Local Development**
```bash
# Ghostwriter Portal
cd ghostwriter-portal
npm run dev  # localhost:5173

# Client Portal  
cd unified-linkedin-project
npm run dev  # localhost:8080
```

## 📚 Documentation

- **CLAUDE.md** - Complete technical documentation
- **CHANGELOG.md** - Detailed change history
- **VERCEL_ENV_VARS.md** - Environment setup guide

## 🎯 Recent Updates (August 23, 2025)

### **Major Changes**
✅ Three-page approval workflow
✅ Complete client isolation system
✅ Archive and scheduling system
✅ Enhanced navigation with client-specific counts
✅ Database schema enhancements
✅ Fixed client portal error handling

### **Benefits**
- Clean, focused interfaces (no more cluttered pages)
- Complete client separation (multi-tenant ready)
- Archive system for dashboard cleanup
- Full publication lifecycle tracking
- Error-free client interactions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Run tests and ensure all workflows pass
4. Submit pull request with comprehensive description

## 📞 Support

- **Documentation**: See `CLAUDE.md` for complete technical guide
- **Issues**: Use GitHub issues for bug reports
- **Features**: Submit feature requests via GitHub discussions

---

**Built for agencies and content teams who need a complete LinkedIn content management solution with client isolation and approval workflows.**