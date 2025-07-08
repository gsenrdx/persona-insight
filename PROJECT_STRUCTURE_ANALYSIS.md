# Persona Insight - Comprehensive Project Structure Analysis

## Project Overview

**Project Name**: Persona Insight  
**Type**: Customer Persona Management and Analysis Platform  
**Framework**: Next.js 15 (App Router)  
**Language**: TypeScript (Strict Mode)  
**Package Manager**: pnpm (Exclusively)  
**Architecture**: Multi-tenant SaaS with Real-time Collaboration  

### Core Technologies Stack
- **Frontend**: React 19, Next.js 15, TanStack Query, Framer Motion
- **UI Library**: shadcn/ui + Radix UI (52 components)
- **Styling**: Tailwind CSS with CSS-in-JS
- **Backend**: Next.js API Routes, Supabase (Database + Auth + Realtime)
- **AI Integration**: MISO API (Primary), OpenAI (Secondary)
- **Testing**: Vitest with React Testing Library
- **Type Safety**: TypeScript with Zod validation

## Directory Structure Analysis

### Root Level Files

#### Configuration Files (Critical)
- `package.json` - **Critical** - Project dependencies and scripts
- `tsconfig.json` - **Critical** - TypeScript configuration with strict mode
- `next.config.mjs` - **Critical** - Next.js configuration
- `tailwind.config.ts` - **High** - Tailwind CSS configuration
- `postcss.config.mjs` - **High** - PostCSS configuration
- `vitest.config.ts` - **Medium** - Testing framework configuration
- `components.json` - **Medium** - shadcn/ui component configuration
- `.env.local` - **Critical** - Environment variables (not in repo)

#### Documentation Files
- `CLAUDE.md` - **Critical** - AI assistant instructions and project guidelines
- `README.md` - **High** - Project documentation
- `TEST_SUMMARY.md` - **Medium** - Testing documentation
- `persona-chat-prompt.txt` - **Medium** - AI persona chat prompts

### `/app` Directory - Next.js App Router (Critical)

#### Page Routes
```
app/
├── page.tsx - **Critical** - Home page (persona listing)
├── layout.tsx - **Critical** - Root layout with providers
├── globals.css - **Critical** - Global styles and Tailwind imports
├── error.tsx - **High** - Error boundary
├── loading.tsx - **Medium** - Loading state
├── not-found.tsx - **Medium** - 404 page
├── global-error.tsx - **High** - Global error handler
├── auth/
│   ├── callback/route.ts - **Critical** - OAuth callback handler
│   └── confirm/page.tsx - **High** - Email confirmation page
├── login/
│   ├── page.tsx - **Critical** - Login page
│   └── login.css - **Medium** - Login-specific styles
├── chat/[personaId]/
│   └── page.tsx - **Critical** - Persona chat interface
├── insights/
│   └── page.tsx - **High** - Insights dashboard
└── projects/
    ├── page.tsx - **Critical** - Projects listing
    └── [id]/page.tsx - **Critical** - Project detail page
```

#### API Routes (`/app/api/`)

**Authentication & User Management**
- `/api/auth/check-email/route.ts` - **High** - Email availability check
- `/api/health/route.ts` - **Medium** - Health check endpoint

**Workflow System (Critical)**
- `/api/workflow/route.ts` - **Critical** - Main file processing pipeline
- `/api/workflow/async/route.ts` - **Critical** - Async processing handler
- `/api/workflow/process/route.ts` - **Critical** - Processing status updates
- `/api/workflow/retry/route.ts` - **High** - Retry failed workflows

**Interview Management**
- `/api/interviews/route.ts` - **Critical** - Interview CRUD operations
- `/api/interviews/[id]/route.ts` - **Critical** - Single interview operations
- `/api/interviews/[id]/status/route.ts` - **High** - Interview status updates
- `/api/interviews/[id]/assign-persona/route.ts` - **High** - Persona assignment
- `/api/interviews/[id]/notes/route.ts` - **Critical** - Collaborative notes
- `/api/interviews/[id]/notes/[noteId]/route.ts` - **High** - Note operations
- `/api/interviews/[id]/notes/[noteId]/replies/route.ts` - **High** - Note replies
- `/api/interviews/batch-assign-persona/route.ts` - **Medium** - Bulk operations
- `/api/interviews/search-with-permissions/route.ts` - **High** - Permission-based search

**Persona System**
- `/api/personas/route.ts` - **Critical** - Persona CRUD operations
- `/api/personas/synthesis/route.ts` - **Critical** - AI persona generation
- `/api/personas/sync/route.ts` - **High** - MISO knowledge sync
- `/api/personas/criteria/route.ts` - **High** - Persona extraction criteria
- `/api/personas/search/route.ts` - **Medium** - Persona search
- `/api/personas/update-dataset/route.ts` - **High** - Dataset management

**Chat System**
- `/api/chat/route.ts` - **Critical** - Persona chat streaming
- `/api/chat/summary/route.ts` - **High** - Chat summary generation
- `/api/chat/interview-question/route.ts` - **Medium** - Interview questions

**Project Management**
- `/api/projects/route.ts` - **Critical** - Project CRUD
- `/api/projects/[id]/route.ts` - **Critical** - Single project operations
- `/api/projects/[id]/join/route.ts` - **High** - Join project flow
- `/api/projects/[id]/members/route.ts` - **High** - Member management
- `/api/projects/[id]/interviews/route.ts` - **High** - Project interviews
- `/api/projects/[id]/insights/route.ts` - **High** - Project insights
- `/api/projects/members/route.ts` - **Medium** - Global member queries

**Insights & Analytics**
- `/api/insights/route.ts` - **High** - Generate insights
- `/api/insights/batch/route.ts` - **Medium** - Batch insights
- `/api/insights/years/route.ts` - **Medium** - Temporal analysis

**Knowledge Management**
- `/api/knowledge/list/route.ts` - **High** - List knowledge bases
- `/api/knowledge/[datasetId]/route.ts` - **High** - Dataset operations
- `/api/knowledge/personas-status/route.ts` - **Medium** - Sync status

**File Operations**
- `/api/files/download/route.ts` - **Medium** - File download handler

### `/components` Directory - React Components

#### Authentication Components (`/components/auth/`)
- `auth-guard.tsx` - **Critical** - Route protection wrapper
- `login-form.tsx` - **Critical** - Login form with validation
- `signup-form.tsx` - **High** - Registration form
- `user-menu.tsx` - **High** - User dropdown menu
- `auth-modal.tsx` - **High** - Authentication modal
- `profile-modal.tsx` - **Medium** - User profile editor
- `animated-logo.tsx` - **Low** - Animated branding
- `company-branding.tsx` - **Medium** - Company logo display

#### Chat Components (`/components/chat/`)
- `chat-interface.tsx` - **Critical** - Main chat UI (needs optimization)
- `components/chat-messages.tsx` - **Critical** - Message display
- `components/chat-input.tsx` - **Critical** - Message input with mentions
- `hooks/use-miso-streaming.ts` - **Critical** - Streaming AI responses
- `hooks/use-mention-system.ts` - **High** - @mention functionality
- `mention/persona-mention-dropdown.tsx` - **High** - Mention suggestions
- `summary/summary-modal.tsx` - **High** - Chat summary display

#### Interview Components (`/components/interview/`)
- `interview-list.tsx` - **Critical** - Interview table view
- `interview-detail.tsx` - **Critical** - Interview detail view
- `interview-script-viewer.tsx` - **Critical** - Script display
- `interview-data-table-infinite.tsx` - **High** - Infinite scroll table
- `interview-assistant-panel.tsx` - **High** - AI assistant sidebar
- `interview-insights.tsx` - **High** - Interview analytics
- `interview-summary.tsx` - **High** - AI-generated summary

#### Project Components (`/components/project/`)
- `pages/project-page-content.tsx` - **Critical** - Project listing page
- `pages/project-detail-content.tsx` - **Critical** - Project detail page
- `components/project-card.tsx` - **High** - Project card display
- `components/join-project-dialog.tsx` - **High** - Join project flow
- `components/invite-member-dialog.tsx` - **High** - Member invitation
- `tabs/project-interviews-polling.tsx` - **High** - Real-time updates
- `tabs/project-insights.tsx` - **High** - Project analytics
- `tabs/project-settings.tsx` - **High** - Project configuration

#### Persona Components (`/components/persona/`)
- `persona-card.tsx` - **Critical** - Persona display card
- `persona-card-grid.tsx` - **Critical** - Persona grid layout
- `persona-switcher.tsx` - **High** - Persona selection dropdown
- `persona-header.tsx` - **Medium** - Persona page header

#### Modal Components (`/components/modal/`)
- `add-interview-modal.tsx` - **Critical** - Interview upload modal
- `persona-assignment-modal.tsx` - **High** - Assign personas
- `persona-criteria-modal.tsx` - **High** - Extraction criteria
- `miso-knowledge-status-modal.tsx` - **Medium** - Sync status
- `edit-interview-metadata-modal.tsx` - **Medium** - Edit metadata

#### UI Components (`/components/ui/`) - shadcn/ui Library
52 pre-configured components including:
- Core: `button.tsx`, `input.tsx`, `dialog.tsx`, `card.tsx` - **Critical**
- Forms: `form.tsx`, `select.tsx`, `checkbox.tsx` - **Critical**
- Display: `table.tsx`, `tabs.tsx`, `badge.tsx` - **High**
- Feedback: `toast.tsx`, `alert.tsx`, `progress.tsx` - **High**
- Layout: `sheet.tsx`, `sidebar.tsx`, `separator.tsx` - **Medium**

### `/hooks` Directory - Custom React Hooks

#### Critical Hooks
- `use-auth.tsx` - **Critical** - Authentication state with caching
- `use-standard-query.ts` - **Critical** - Standardized API queries
- `use-personas.ts` - **Critical** - Persona data management
- `use-projects.ts` - **Critical** - Project management

#### High Priority Hooks
- `use-interview-notes.ts` - **High** - Real-time interview notes
- `use-interview-status-monitor.ts` - **High** - Interview processing status
- `use-project-insights.ts` - **High** - Project analytics data
- `use-persona-definitions.ts` - **High** - Persona type definitions

#### Utility Hooks
- `use-debounce.ts` - **Medium** - Input debouncing
- `use-toast.ts` - **Medium** - Toast notifications
- `use-mobile.ts` - **Low** - Mobile detection
- `use-is-client.ts` - **Low** - Client-side check

### `/lib` Directory - Core Libraries and Services

#### API Layer (`/lib/api/`)
- `base.ts` - **Critical** - Base API client with auth
- `auth.ts` - **Critical** - Authentication utilities
- `interviews.ts` - **High** - Interview API calls
- `personas.ts` - **High** - Persona API calls
- `projects.ts` - **High** - Project API calls
- `persona-criteria.ts` - **Medium** - Criteria management

#### Configuration (`/lib/config/`)
- `api.ts` - **Critical** - API configuration and timeouts
- `workflow.ts` - **Critical** - Processing pipeline config
- `defaults.ts` - **High** - Default values and types
- `ui.ts` - **Medium** - UI configuration
- `upload.ts` - **Medium** - File upload limits

#### Services (`/lib/services/`)

**MISO Integration (`/lib/services/miso/`)**
- `api.ts` - **Critical** - MISO API client
- `workflow.ts` - **Critical** - Topic synchronization
- `parser.ts` - **Critical** - Interview data parsing
- Tests included for all MISO services

**Other Services**
- `personas/personas.service.ts` - **High** - Persona business logic
- `projects/projects.service.ts` - **High** - Project operations
- `insights/insights.service.ts` - **High** - Analytics service
- `project-insights.service.ts` - **High** - Project-level insights

#### Utilities (`/lib/utils/`)
- `auth-cache.ts` - **Critical** - Authentication caching (LRU)
- `file.ts` - **High** - File validation and processing
- `validation.ts` - **High** - Input validation helpers
- `mention.ts` - **Medium** - @mention parsing
- `format.ts` - **Medium** - Data formatting
- `date.ts` - **Medium** - Date utilities
- `cn.ts` - **Low** - Class name helper

#### Other Libraries
- `supabase.ts` - **Critical** - Supabase client initialization
- `supabase-server.ts` - **Critical** - Server-side Supabase
- `query-client.ts` - **Critical** - TanStack Query setup
- `query-keys.ts` - **High** - Query key management
- `miso-knowledge.ts` - **High** - Knowledge base integration

### `/types` Directory - TypeScript Definitions

#### Core Types
- `supabase.ts` - **Critical** - Auto-generated database types
- `database.ts` - **Critical** - Database schema types
- `business.ts` - **Critical** - Business logic types
- `api.ts` - **Critical** - API response types

#### Domain Types
- `persona.ts` - **Critical** - Persona data structures
- `interview.ts` - **Critical** - Interview types
- `project.ts` - **Critical** - Project types
- `workflow.ts` - **High** - Processing pipeline types
- `interviewee.ts` - **High** - Interview data types
- `interview-notes.ts` - **High** - Collaboration types
- `insights.ts` - **High** - Analytics types
- `persona-criteria.ts` - **Medium** - Extraction criteria
- `persona-definition.ts` - **Medium** - Persona templates

### `/supabase` Directory - Database

#### Migrations
- Performance indexes and optimizations
- Real-time subscriptions setup
- RLS (Row Level Security) policies
- RPC functions for complex queries

### `/docs` Directory - Technical Documentation

#### Real-time System Documentation
- `REALTIME_ARCHITECTURE.md` - **Critical** - System design
- `REALTIME_MIGRATION_COMPLETE.md` - **High** - Migration guide
- `BROADCAST_MIGRATION_GUIDE.md` - **High** - Broadcast patterns
- `REALTIME_OPTIMIZATION_GUIDE.md` - **High** - Performance tips
- `SSE_IMPLEMENTATION_GUIDE.md` - **Medium** - SSE alternative

#### MISO API Documentation
- `miso/api_guide/*.md` - **High** - MISO integration guides

#### Other Documentation
- `PHASE1_IMPLEMENTATION_SUMMARY.md` - **Medium** - Phase 1 summary
- `PHASE2_ADAPTIVE_STRATEGY_PLAN.md` - **Medium** - Phase 2 plan
- Various fix documentation - **Low** - Historical fixes

### `/public` Directory - Static Assets
- `logo.svg` - **Medium** - Company logo
- `chat-icon.png` - **Low** - Chat icon
- `GitHub_README.png` - **Low** - README image

### `/test` Directory - Testing
- `setup.ts` - **High** - Test configuration
- Component tests in `__tests__` folders
- Service tests for critical functions

## Data Flow Architecture

### Authentication Flow
1. User login via Supabase Auth
2. JWT token acquisition
3. Profile loading with company context
4. Auth cache storage (5-min TTL)
5. Bearer token attachment to API calls

### Interview Processing Flow
1. File upload (audio/text/PDF/Excel)
2. Queue management in localStorage
3. MISO API processing
4. Interview data storage
5. Persona synthesis trigger
6. Knowledge base synchronization

### Real-time Collaboration Flow
1. Supabase channel subscription
2. Presence tracking
3. Broadcast event propagation
4. Optimistic UI updates
5. Conflict resolution

### Persona Generation Flow
1. Interview analysis completion
2. AI synthesis request
3. Persona creation
4. MISO knowledge sync
5. Topic document generation

## Component Relationships

### Page Component Hierarchy
```
RootLayout
├── AuthGuard
│   ├── HomePage → PersonaCardGrid
│   ├── ProjectsPage → ProjectGrid → ProjectCard
│   ├── ProjectDetailPage
│   │   ├── ProjectInterviews → InterviewList
│   │   ├── ProjectInsights → InsightsCharts
│   │   └── ProjectSettings → MemberManagement
│   ├── ChatPage → ChatInterface
│   └── InsightsPage → InsightsDashboard
└── LoginPage → LoginForm
```

### Service Dependencies
```
API Routes
├── MISO Service
│   ├── Workflow API
│   ├── Knowledge API
│   └── Agent API
├── Supabase Service
│   ├── Database Queries
│   ├── Auth Management
│   └── Realtime Subscriptions
└── OpenAI Service
    ├── Insights Generation
    └── Summary Creation
```

### State Management Flow
```
TanStack Query
├── Server State Cache
├── Optimistic Updates
└── Background Refetch

Context Providers
├── AuthContext (Global Auth)
├── InterviewRealtimeContext (Collaboration)
└── ThemeProvider (UI Theme)

Local Storage
├── Workflow Queue
├── Draft Personas
└── UI Preferences
```

## Performance Considerations

### Known Issues
1. **N+1 Queries** in workflow processing
2. **Component Re-renders** in chat interface
3. **Bundle Size** - 519MB node_modules

### Optimization Opportunities
1. Batch database operations
2. Implement proper memoization
3. Add localStorage size limits
4. Remove unused dependencies
5. Implement code splitting

## Security Architecture

### Multi-tenancy
- Company-level data isolation
- Row Level Security (RLS) policies
- Role-based access control
- Project-level permissions

### API Security
- JWT authentication
- Service role keys for server operations
- API rate limiting
- Input validation with Zod

## Deployment Configuration

### Environment Variables
- MISO API keys (3 different keys)
- Supabase credentials
- OpenAI API key
- Service URLs

### Build Process
- Next.js production build
- TypeScript compilation
- Tailwind CSS optimization
- Environment validation

## Active vs Deprecated Features

### Active Features
- All core functionality is actively used
- Real-time collaboration recently implemented
- Broadcast system is the latest architecture

### Deprecated/Unused
- Some Radix UI components installed but unused
- Legacy real-time implementations (replaced by broadcast)
- Old polling mechanisms (replaced by subscriptions)

## Critical Files Summary

### Absolutely Critical (System won't function)
1. `/app/layout.tsx` - Root layout and providers
2. `/app/api/workflow/route.ts` - Core processing pipeline
3. `/lib/supabase.ts` - Database connection
4. `/hooks/use-auth.tsx` - Authentication state
5. `/components/auth/auth-guard.tsx` - Route protection

### High Priority (Major features)
1. All API route handlers
2. Core component pages
3. Service implementations
4. Real-time providers
5. Type definitions

### Medium Priority (Supporting features)
1. UI components
2. Utility functions
3. Configuration files
4. Modal components
5. Documentation

### Low Priority (Nice to have)
1. Animations
2. Themes
3. Icons
4. Test files
5. Historical documentation

## Database Schema Details

### Core Tables (from Supabase types)
1. **companies** - Multi-tenant organization management
   - Core fields: id, name, description, domains[], is_active
   - Central tenant identifier for all data

2. **profiles** - User accounts with role-based access
   - Links to companies table
   - Roles: super_admin, company_admin, company_user
   - Manages user permissions and company associations

3. **projects** - Project management with flexible access
   - Visibility: public/private
   - Join methods: open/invite_only/password
   - Metadata: purpose, target_audience, research_method

4. **project_members** - Team collaboration
   - Roles: owner/admin/member
   - Permission-based feature access

5. **interviewees** - Raw interview data storage
   - JSON structure for flexible data
   - Links to projects and companies
   - Stores audio/text processing results

6. **interview_notes** - Collaborative annotations
   - Real-time synchronized
   - Supports threading with replies
   - Soft delete support

7. **personas** - AI-generated personas
   - Pain points, needs, insights
   - Links to interviews
   - MISO dataset integration

8. **main_topics** - Extracted topics per company
   - Used for insights and trends
   - Synchronized with MISO knowledge base

## Special Architectural Patterns

### 1. Real-time Broadcast System
- **Architecture**: Moved from Postgres Changes to Broadcast
- **Performance**: 95% latency reduction (400ms → 30ms)
- **Features**: 
  - Message deduplication
  - Optimistic updates
  - Automatic reconnection
  - Presence tracking
  - Conflict resolution

### 2. Authentication Caching Layer
- **Implementation**: LRU cache with 5-minute TTL
- **Capacity**: 1000 entries maximum
- **Impact**: 80% reduction in profile lookups
- **Location**: `/lib/utils/auth-cache.ts`

### 3. File Processing Queue
- **Storage**: localStorage-based queue
- **Concurrency**: Max 5 files (configurable)
- **Retry**: 3 attempts with exponential backoff
- **States**: PENDING → PROCESSING → COMPLETED/FAILED
- **Issue**: No size limits causing potential crashes

### 4. MISO Integration Pattern
- **Three API Keys**:
  - Workflow API - File processing
  - Agent API - Chat conversations
  - Knowledge API - Document management
- **Knowledge Base Sync**: Automatic topic document creation
- **Streaming**: Real-time AI responses

### 5. Multi-tenant Data Isolation
- **Strategy**: All queries filtered by company_id
- **Implementation**: Supabase RLS policies
- **Enforcement**: Server-side validation
- **Scope**: Complete data isolation between companies

## Configuration Management

### Environment Variables Structure
```
# Database & Auth
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# MISO API Integration
MISO_API_URL=https://api.holdings.miso.gs
MISO_API_KEY            # Workflow processing
MISO_AGENT_API_KEY      # Chat conversations
MISO_KNOWLEDGE_API_KEY  # Knowledge management
MISO_API_OWNER_ID       # API owner identifier

# AI Services
OPENAI_API_KEY          # Secondary AI features
```

### Build Configuration
- **TypeScript**: Strict mode with all checks enabled
- **ESLint**: Errors on console.log and debugger
- **Prettier**: Single quotes, semicolons, 100 char width
- **Next.js**: 
  - Build errors ignored (temporary)
  - Image optimization enabled
  - Radix UI package optimization
  - Chunk splitting for performance

## Development Workflow

### Commands
```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm test             # Run tests
pnpm lint             # Code linting
```

### Git Branch Structure
- **main** - Production branch
- **feature/** - Feature development
- Current: `feature/project-cards-animation`

### Testing Strategy
- **Framework**: Vitest with React Testing Library
- **Coverage**: Critical services and hooks
- **Location**: `__tests__` folders and `/test/setup.ts`

## Performance Bottlenecks

### Critical Issues
1. **Workflow N+1 Queries** (`/api/workflow/route.ts:255-278`)
   - Processes topics individually
   - Potential improvement: 2.5s → 0.1s

2. **Bundle Size Issues**
   - 519MB node_modules
   - Many unused dependencies

3. **Chat Re-renders** (`/components/chat/chat-interface.tsx`)
   - Missing memoization
   - Causes performance degradation

### Bundle Size Issues
- **node_modules**: 519MB (target: 280MB)
- **Unused Radix Components**: 11 installed but unused
- **Dev Dependencies**: Included in production

## Monitoring and Debugging

### Real-time Health Monitoring
- 30-second heartbeat checks
- Automatic reconnection with backoff
- JWT refresh every 30 minutes
- Connection state tracking

### Debug Points
1. Network tab for slow API calls
2. React DevTools for re-renders
3. Supabase dashboard for queries
4. Browser console for real-time events
5. Auth cache hit rates in development

## Future Considerations

### Planned Improvements
1. Implement Web Workers for file processing
2. Add proper error boundaries
3. Optimize bundle with code splitting
4. Add integration tests
5. Implement proper CI/CD pipeline

### Technical Debt
1. Remove unused dependencies
2. Fix TypeScript build errors
3. Add proper loading states
4. Implement proper error handling
5. Add comprehensive documentation