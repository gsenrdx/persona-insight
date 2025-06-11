# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
pnpm run dev          # Start development server on localhost:3000
pnpm run build        # Production build
pnpm run start        # Start production server
pnpm run lint         # Run Next.js linter
```

## Architecture Overview

This is a **customer persona management and analysis platform** built with Next.js 15, integrating AI-powered interview analysis and persona generation.

### Core Domains
- **Interview Analysis**: Audio/text file upload with AI-powered analysis via MISO API
- **Persona Generation**: AI synthesis of user personas from interview data
- **Interactive Chat**: Real-time conversations with generated personas
- **Project Management**: Team collaboration with role-based permissions
- **Insights Dashboard**: Temporal trend analysis and data visualization

### Database Schema (Supabase)
Key entities with hierarchical relationships:
- `companies` → `profiles` (multi-tenant with role-based access)
- `projects` → `project_members` (team collaboration)
- `interviewees` (raw interview data with JSON structure)
- `personas` (generated personas with pain points, needs, insights)
- `main_topics` (extracted topics per company)

Role hierarchy: `super_admin` > `company_admin` > `company_user`

### API Architecture
- `/api/workflow/` - Main interview analysis pipeline (MISO API integration)
- `/api/chat/` - Persona conversation streaming
- `/api/persona-synthesis/` - AI persona generation
- `/api/mindmap/generate/` - Mind map visualization
- `/api/supabase/` - Database CRUD operations

External integrations:
- **MISO API** (`api.holdings.miso.gs`) - Primary AI workflow engine
- **OpenAI** - Secondary AI features (insights, mindmaps)

### Component Structure
- `components/auth/` - Authentication and authorization
- `components/persona/` - Persona cards, switcher, floating actions
- `components/project/` - Project management, settings, interview lists
- `components/chat/` - Real-time conversation interface
- `components/modal/` - Workflow progress, interview upload
- `components/shared/` - Navigation, theme, common utilities
- `components/ui/` - shadcn/ui design system components

### State Management
- **TanStack Query** - Server state, caching, and synchronization
- **Custom Hooks** - Business logic encapsulation (`use-auth`, `use-workflow-queue`, `use-projects`)
- **Context API** - Global auth state
- **localStorage** - Workflow queue persistence

### AI Workflow System
File processing pipeline: Upload → MISO Analysis → Storage → Persona Synthesis

States: `PENDING` → `PROCESSING` → `COMPLETED` (with failure handling)
- Concurrent processing (max 5 files)
- Queue-based management with retry capability
- Real-time progress feedback

### Authentication Flow
Supabase Auth with JWT tokens:
1. Login → JWT acquisition
2. Profile + company data loading
3. Role-based UI/feature restrictions
4. Bearer token attachment for API requests

### Key Technical Patterns
- **Multi-tenant Architecture**: Company-level data isolation
- **Streaming Responses**: Real-time AI chat and analysis
- **File Upload Workflow**: Async processing with queue management
- **Permission-based Routing**: Dynamic access control
- **Type Safety**: Comprehensive TypeScript coverage with Supabase types