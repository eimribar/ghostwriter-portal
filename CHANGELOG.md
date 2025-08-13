# Changelog - Ghostwriter Portal

All notable changes to the Ghostwriter Portal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive CLAUDE.md documentation file with full technical specifications
- CHANGELOG.md for tracking all major changes going forward

## [2024.12.14] - 2024-12-14

### Added
- **Prompt Management System** - Complete CRUD interface for managing AI prompts
  - Created `Prompts.tsx` page component with full functionality
  - Grid view with search and category filtering
  - Create, Edit, Delete, and Duplicate operations
  - View modal for reading full prompt content
  - Usage tracking and success rate metrics display
- **Database Schema for Prompts**
  - `prompt_templates` table with comprehensive fields
  - `prompt_usage_history` table for tracking prompt usage
  - Version history support with parent_id references
  - RLS policies and proper indexes for performance
- **Populated Actual LinkedIn Prompts**
  - Migrated all 4 LinkedIn content generation prompts from `linkedin-prompts.ts`
  - Full system messages preserved (not truncated)
  - Proper examples and settings for each prompt
  - Categories: Content Generation, Content Ideation, Content Editing

### Changed
- **Approval Flow Improvements**
  - Removed client dependency from content generation
  - Content now saves directly without requiring client selection
  - Bypassed content_ideas table entirely for simpler flow
  - Changed status values: 'pending' → 'draft', 'approved' → 'admin_approved'
- **User Portal Cleanup**
  - Removed ALL mock data (Amnon Cohen profile, mock LinkedIn posts)
  - Removed Generate route from User Portal
  - Removed ContentLake route from User Portal
  - Fixed routing to use correct Approve.tsx component
- **Database Structure**
  - Made client_id, idea_id, user_id optional (using undefined instead of null)
  - Fixed TypeScript type safety with GeneratedContent interface
  - Added comprehensive logging throughout approval flow

### Fixed
- Content save functionality working end-to-end
- Approval button now properly updates status to 'admin_approved'
- TypeScript build errors with unused imports
- Status enum mismatches between portals
- Vercel deployment environment variables properly configured

### Database Scripts Created
- `create_prompt_templates_table.sql` - Complete prompt management schema
- `populate_prompts.sql` - Actual LinkedIn prompts with full content
- `FINAL_FIX_DATABASE.sql` - Comprehensive database fixes

## [2024.12.13] - 2024-12-13

### Added
- Database migration scripts for `generated_content` table
- DATABASE_SETUP.md with complete setup instructions
- RLS policy configuration scripts
- Status constraint fix scripts
- Better error handling for missing database tables
- Clear error messages when tables don't exist

### Fixed
- Critical bug: Posts not saving due to missing `generated_content` table
- Row Level Security policies blocking inserts
- Status constraint not accepting 'draft' value
- Database connection error messages now more informative

### Changed
- Improved error handling in database.service.ts to detect missing tables
- Added specific alerts for database configuration issues

## [2024.12.12] - 2024-12-12

### Added
- Portal Switcher component for navigation to User Portal
- Environment variable configuration for Vercel deployment
- Auto-save functionality for generated content
- Debugging logs for content generation and saving process

### Changed
- Updated design system to zinc/black/white color palette
- Replaced all gradient components with solid colors for better visibility
- Modified Gemini API to use 2.5 Pro model specifically
- Updated temperature setting to 1.5 for more creative output

### Fixed
- Content not appearing in approval queue after generation
- Duplicate environment variable error in Vercel deployment
- Mock data appearing instead of real AI-generated content

### Security
- Removed all hardcoded API keys from codebase
- Deleted test files containing exposed credentials
- Updated Google API key after security incident
- Implemented environment-only credential management

## [2024.12.11] - 2024-12-11

### Added
- Initial portal setup with React 18 and TypeScript
- Vite 7.1.2 build configuration
- Supabase database integration
- Google Gemini API integration for content generation
- Four LinkedIn prompt templates (RevOps, SaaStr, Sales Excellence, Data/Listicle)

### Features
- Content generation page with 4 variations per prompt
- Approval queue with pending/approved/rejected status
- Schedule management system
- Client management interface
- Analytics dashboard foundation

### Database
- Created content_ideas table
- Created generated_content table with LLM tracking
- Created scheduled_posts table
- Created clients and users tables
- Implemented Row Level Security policies

## [2024.12.10] - 2024-12-10

### Initial Setup
- Project initialization with React + Vite
- Tailwind CSS configuration
- Basic routing structure with React Router v6
- Authentication context setup
- Navigation sidebar component

---

## Version History

- **Current**: Development version (unreleased)
- **2024.12.14**: Prompt management system and approval flow fixes
- **2024.12.13**: Database fixes and better error handling
- **2024.12.12**: Security fixes and portal integration
- **2024.12.11**: Core features implementation
- **2024.12.10**: Initial project setup

## Links

- [GitHub Repository](https://github.com/eimribar/ghostwriter-portal)
- [Production URL](https://ghostwriter-portal.vercel.app)
- [User Portal](https://unified-linkedin-project.vercel.app)
- [Documentation](./CLAUDE.md)