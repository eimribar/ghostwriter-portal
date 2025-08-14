# Ghostwriter Portal

Admin portal for managing LinkedIn content creation and client approvals.

## Features

- **Content Ideation**: Real-time news search with GPT-5 web search (2-5 min processing)
- **Content Lake**: Browse and manage high-performing LinkedIn creators
- **Content Generation**: Create 6 AI-powered variations per idea
- **News & Trends**: Discover trending topics from actual web news
- **Client Management**: Assign content to clients for approval
- **Analytics**: Track content performance (coming soon)
- **Scheduling**: Content calendar management (coming soon)

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (database)
- Multi-LLM support:
  - Google Gemini 2.5 Pro (content generation)
  - GPT-5 Responses API with Web Search (news & ideation)
  - Claude & GPT-4 (optional)

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

Create a `.env.local` file with:

```bash
# Required
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_API_KEY=your_google_api_key

# Required for Content Ideation
VITE_OPENAI_API_KEY=your_openai_api_key  # GPT-5 access
VITE_GPT5_MODEL=gpt-5                    # Default: gpt-5
```

## Deployment

This project is deployed on Vercel.