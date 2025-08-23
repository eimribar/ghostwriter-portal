# Ghostwriter Portal 🚀

**Admin Dashboard for LinkedIn Content Generation & Management**

[![Deployment Status](https://img.shields.io/badge/Vercel-Deployed-success)](https://ghostwriter-portal.vercel.app)
[![GPT-5](https://img.shields.io/badge/GPT--5-Working-green)](https://platform.openai.com)
[![Gemini](https://img.shields.io/badge/Gemini%202.5-Active-blue)](https://ai.google.dev)

## 🎯 Current Status (August 15, 2025)

### ✅ FULLY OPERATIONAL
- **GPT-5 Web Search**: Real-time news & trends (2-5 min processing)
- **Background Processing**: Async job queue with email notifications
- **Content Generation**: Gemini 2.5 Pro with 1M+ tokens
- **Approval Workflow**: Complete admin → user flow
- **Email Notifications**: Automated via Resend API

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Vercel account
- Supabase account
- OpenAI API access (GPT-5)
- Google AI API key (Gemini)
- Resend API key

### Installation
```bash
# Clone repository
git clone https://github.com/eimribar/ghostwriter-portal.git
cd ghostwriter-portal

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Start development server
npm run dev
```

## 🔑 Critical Setup: Environment Variables

### ⚠️ IMPORTANT for Vercel Deployment
You MUST set environment variables TWICE in Vercel:
1. **WITH** `VITE_` prefix (for frontend)
2. **WITHOUT** `VITE_` prefix (for serverless functions)

See [VERCEL_ENV_VARS.md](./VERCEL_ENV_VARS.md) for complete setup.

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete system documentation
- **[CHANGELOG.md](./CHANGELOG.md)** - Recent updates and fixes
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues & solutions
- **[BACKGROUND_SEARCH.md](./BACKGROUND_SEARCH.md)** - Background search feature
- **[VERCEL_ENV_VARS.md](./VERCEL_ENV_VARS.md)** - Environment setup guide

## 🎨 Features

### Content Generation (/generate)
- 🎯 **Database-Driven Prompts** (no hardcoded templates)
- 🎛️ **Dynamic Variations** (1-10 variations)
- 🎨 **Multiple Strategies** (same prompt, different prompts, mixed)
- ⚡ **Multi-Provider Support** (Google Gemini 2.5 Pro, OpenAI, Anthropic)
- 🌐 **Google Grounding** enabled by default
- 🔗 **URL Auto-extraction** and analysis

### Content Ideation (/ideation)
- GPT-5 web search
- Real-time news
- Background processing
- Email notifications

### Approval Queue (/approval)
- Draft → Admin Approved → Client Approved
- In-line editing
- Status filtering

### Prompt Management (/prompts) - MAJOR UPGRADE
- 🧪 **Live Testing** - Test prompts with real API calls before using
- 📦 **Bulk Operations** - Select, activate, duplicate, delete multiple prompts
- 📥📤 **Import/Export** - Backup and share prompt collections
- 🎯 **Full CRUD** operations with instant UI updates
- 📊 **Performance Tracking** - Response times, success rates, usage stats
- 📚 **Collections System** - Organize prompts by theme/category
- ⭐ **Favorites** - Mark frequently used prompts
- 🔍 **Advanced Filtering** - Search by name, description, tags
- 🎨 **Tone & Format Presets** - Professional, casual, technical styles
- ✅ **Zero Hardcoded Dependencies** - Complete database control

## 🏗️ Architecture

```
Frontend (React + TypeScript)
    ↓
Vercel Serverless Functions
    ↓
Supabase (PostgreSQL)
    ↓
AI APIs (GPT-5, Gemini)
```

## 📊 Recent Performance

- **GPT-5 Search**: ~1.2M tokens/search
- **Processing Time**: 2-5 minutes
- **Success Rate**: 100% (after fixes)
- **Email Delivery**: <2 seconds

## 🐛 Recent Fixes (August 14-15, 2025)

1. ✅ Fixed environment variables for serverless functions
2. ✅ Corrected GPT-5 API parameters
3. ✅ Fixed response parsing structure
4. ✅ Implemented background job queue
5. ✅ Added email notifications

## 🚦 Testing Checklist

- [x] GPT-5 API calls working
- [x] Background search creates jobs
- [x] Jobs process successfully
- [x] Ideas save to database
- [x] Email notifications send
- [x] Ideas display in UI
- [x] Manual email check works

## 📞 Support

- **Email**: eimrib@yess.ai
- **GitHub**: [Issues](https://github.com/eimribar/ghostwriter-portal/issues)

## 🔮 Roadmap

- [ ] Bulk approval
- [ ] Content calendar
- [ ] LinkedIn API publishing
- [ ] Team collaboration
- [ ] Analytics dashboard
- [ ] A/B testing

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📄 License

Private repository - All rights reserved

---

**Last Updated**: August 15, 2025
**Version**: 2.0.0
**Status**: Production Ready ✅