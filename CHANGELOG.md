# Changelog - Ghostwriter Portal

All notable changes to the Ghostwriter Portal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive CLAUDE.md documentation file with full technical specifications
- CHANGELOG.md for tracking all major changes going forward

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
- **2024.12.12**: Security fixes and portal integration
- **2024.12.11**: Core features implementation
- **2024.12.10**: Initial project setup

## Links

- [GitHub Repository](https://github.com/eimribar/ghostwriter-portal)
- [Production URL](https://ghostwriter-portal.vercel.app)
- [User Portal](https://unified-linkedin-project.vercel.app)
- [Documentation](./CLAUDE.md)