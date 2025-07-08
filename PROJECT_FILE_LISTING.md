# Complete Project File Listing

## Root Configuration Files

### Build & Development
- `package.json` - Project dependencies, scripts, and metadata (Active)
- `pnpm-lock.yaml` - Locked dependency versions for pnpm (Active)
- `tsconfig.json` - TypeScript compiler configuration (Active)
- `tailwind.config.ts` - Tailwind CSS configuration with custom theme (Active)
- `vitest.config.ts` - Vitest test runner configuration (Active)
- `components.json` - shadcn/ui component configuration (Active)

### Code Quality
- `.eslintrc.json` - ESLint linting rules configuration (Active)
- `.prettierrc.json` - Prettier code formatting rules (Active)

### Environment
- `.env.example` - Example environment variables template (Active)
- `.env.local` - Local environment variables (Active, gitignored)
- `.env.local.example` - Local environment example (Active)

### IDE & Tools
- `.vscode/extensions.json` - Recommended VS Code extensions (Active)
- `.vercel/project.json` - Vercel deployment configuration (Active)
- `claude_desktop_config.json` - Claude Desktop app configuration (Active)
- `.claude/settings.local.json` - Claude AI settings (Active)

### Documentation
- `README.md` - Project overview and setup instructions (Active)
- `CLAUDE.md` - Claude AI development guidelines (Active)
- `PROJECT_STRUCTURE.md` - Project architecture documentation (Active)
- `PROJECT_STRUCTURE_ANALYSIS.md` - Detailed structure analysis (Active)
- `TEST_SUMMARY.md` - Test suite documentation (Active)

## App Directory (Next.js 15 App Router)

### Root Layout & Pages
- `app/layout.tsx` - Root layout with providers and global setup (Active)
  - Dependencies: auth provider, theme provider, query provider
- `app/globals.css` - Global CSS with Tailwind directives (Active)
- `app/page.tsx` - Home page redirecting to projects (Active)
- `app/page-prefetch.tsx` - Page prefetching utility (Active)
- `app/loading.tsx` - Global loading state UI (Active)
- `app/error.tsx` - Error boundary for app directory (Active)
- `app/global-error.tsx` - Global error boundary (Active)
- `app/not-found.tsx` - 404 page component (Active)

### Feature Pages
- `app/login/page.tsx` - Login page with authentication form (Active)
  - Dependencies: auth components, Supabase auth
- `app/login/login.css` - Login page specific styles (Active)
- `app/auth/confirm/page.tsx` - Email confirmation page (Active)
- `app/auth/callback/route.ts` - OAuth callback handler (Active)
- `app/projects/page.tsx` - Projects listing page (Active)
  - Dependencies: project components, use-projects hook
- `app/projects/[id]/page.tsx` - Project detail page with tabs (Active)
  - Dependencies: project layout, interview list, insights
- `app/chat/[personaId]/page.tsx` - Persona chat interface page (Active)
  - Dependencies: chat components, persona data
- `app/insights/page.tsx` - Company-wide insights dashboard (Active)
  - Dependencies: insights service, visualization components

### API Routes

#### Authentication
- `app/api/auth/check-email/route.ts` - Email availability check (Active)

#### Health Check
- `app/api/health/route.ts` - API health check endpoint (Active)

#### File Management
- `app/api/files/download/route.ts` - File download handler (Active)

#### Workflow Processing
- `app/api/workflow/route.ts` - Main interview file processing pipeline (Active)
  - Dependencies: MISO API, file parsers, Supabase
  - Known issue: N+1 query problem
- `app/api/workflow/async/route.ts` - Async workflow processing (Active)
- `app/api/workflow/process/route.ts` - Process specific workflow (Active)
- `app/api/workflow/retry/route.ts` - Retry failed workflows (Active)

#### Interview Management
- `app/api/interviews/route.ts` - List/create interviews (Active)
- `app/api/interviews/[id]/route.ts` - Get/update/delete interview (Active)
- `app/api/interviews/[id]/status/route.ts` - Update interview status (Active)
- `app/api/interviews/[id]/assign-persona/route.ts` - Assign persona to interview (Active)
- `app/api/interviews/batch-assign-persona/route.ts` - Batch persona assignment (Active)
- `app/api/interviews/search-with-permissions/route.ts` - Search with RBAC (Active)

#### Interview Notes (Real-time Collaboration)
- `app/api/interviews/[id]/notes/route.ts` - Create/list interview notes (Active)
- `app/api/interviews/[id]/notes/[noteId]/route.ts` - Update/delete note (Active)
- `app/api/interviews/[id]/notes/[noteId]/replies/route.ts` - Create/list replies (Active)
- `app/api/interviews/[id]/notes/[noteId]/replies/[replyId]/route.ts` - Update/delete reply (Active)

#### Persona Management
- `app/api/personas/route.ts` - List/create personas (Active)
- `app/api/personas/search/route.ts` - Search personas (Active)
- `app/api/personas/criteria/route.ts` - Get/update persona criteria (Active)
- `app/api/personas/synthesis/route.ts` - AI persona generation (Active)
  - Dependencies: MISO API, OpenAI
- `app/api/personas/sync/route.ts` - Sync personas with knowledge base (Active)
- `app/api/personas/update-dataset/route.ts` - Update MISO dataset (Active)
- `app/api/supabase/personas/route.ts` - Direct Supabase persona queries (Active)

#### Chat & AI
- `app/api/chat/route.ts` - Streaming chat with personas (Active)
  - Dependencies: MISO Agent API, mention system
- `app/api/chat/summary/route.ts` - Generate chat summary/mindmap (Active)
  - Dependencies: OpenAI
- `app/api/chat/interview-question/route.ts` - Generate interview questions (Active)

#### Insights & Analytics
- `app/api/insights/route.ts` - Generate company insights (Active)
- `app/api/insights/batch/route.ts` - Batch insight generation (Active)
- `app/api/insights/years/route.ts` - Get available years (Active)

#### Project Management
- `app/api/projects/route.ts` - List/create projects (Active)
- `app/api/projects/[id]/route.ts` - Get/update/delete project (Active)
- `app/api/projects/[id]/join/route.ts` - Join public project (Active)
- `app/api/projects/[id]/members/route.ts` - List project members (Active)
- `app/api/projects/[id]/members/[memberId]/route.ts` - Update member role (Active)
- `app/api/projects/[id]/interviews/route.ts` - Get project interviews (Active)
- `app/api/projects/[id]/insights/route.ts` - Get project insights (Active)
- `app/api/projects/members/route.ts` - List all project members (Active)

#### Knowledge Base
- `app/api/knowledge/list/route.ts` - List MISO datasets (Active)
- `app/api/knowledge/[datasetId]/route.ts` - Get dataset details (Active)
- `app/api/knowledge/personas-status/route.ts` - Check persona sync status (Active)

## Components Directory

### Authentication Components
- `components/auth/index.ts` - Auth component exports (Active)
- `components/auth/auth-guard.tsx` - Route protection wrapper (Active)
- `components/auth/auth-modal.tsx` - Authentication modal container (Active)
- `components/auth/login-form.tsx` - Login form with validation (Active)
- `components/auth/signup-form.tsx` - Signup form with validation (Active)
- `components/auth/auth-buttons.tsx` - Social auth buttons (Active)
- `components/auth/user-menu.tsx` - User dropdown menu (Active)
- `components/auth/profile-modal.tsx` - User profile edit modal (Active)
- `components/auth/login-page-content.tsx` - Login page layout (Active)
- `components/auth/company-branding.tsx` - Company logo display (Active)
- `components/auth/animated-logo.tsx` - Animated logo component (Active)
- `components/auth/oscilloscope-logo.tsx` - SVG logo animation (Active)

### Chat Components
- `components/chat/index.ts` - Chat component exports (Active)
- `components/chat/chat-interface.tsx` - Main chat UI container (Active)
  - Known issue: Lacks memoization
- `components/chat/types.ts` - Chat type definitions (Active)
- `components/chat/styles.ts` - Chat styling constants (Active)
- `components/chat/components/chat-header.tsx` - Chat header with persona info (Active)
- `components/chat/components/chat-messages.tsx` - Message list container (Active)
- `components/chat/components/chat-message.tsx` - Individual message component (Active)
- `components/chat/components/chat-input.tsx` - Message input with mentions (Active)
- `components/chat/components/summary-button.tsx` - Generate summary button (Active)
- `components/chat/hooks/use-mention-system.ts` - Mention functionality hook (Active)
- `components/chat/hooks/use-miso-streaming.ts` - Streaming response hook (Active)
- `components/chat/mention/index.ts` - Mention system exports (Active)
- `components/chat/mention/mention-input-overlay.tsx` - Mention overlay UI (Active)
- `components/chat/mention/clean-input-overlay.tsx` - Clean input display (Active)
- `components/chat/mention/persona-mention-dropdown.tsx` - Persona selector (Active)
- `components/chat/mention/message-content.tsx` - Message renderer (Active)
- `components/chat/summary/index.ts` - Summary component exports (Active)
- `components/chat/summary/summary-modal.tsx` - Summary display modal (Active)
- `components/chat/__tests__/chat-interface.test.tsx` - Chat interface tests (Test)

### Interview Components
- `components/interview/interview-list.tsx` - Interview list container (Active)
- `components/interview/interview-data-table-clean.tsx` - Clean data table (Active)
- `components/interview/interview-data-table-infinite.tsx` - Infinite scroll table (Active)
- `components/interview/interview-columns.tsx` - Table column definitions (Active)
- `components/interview/interview-detail.tsx` - Interview detail view (Active)
- `components/interview/interview-script-viewer.tsx` - Script display (Active)
- `components/interview/readonly-script-item.tsx` - Read-only script item (Active)
- `components/interview/interview-summary.tsx` - Interview summary view (Active)
- `components/interview/interview-summary-sidebar.tsx` - Summary sidebar (Active)
- `components/interview/interview-insights.tsx` - Interview insights display (Active)
- `components/interview/interview-assistant-panel.tsx` - AI assistant panel (Active)

### Layout Components
- `components/layout/app-layout.tsx` - Main app layout wrapper (Active)
- `components/layout/project-layout.tsx` - Project page layout (Active)

### Modal Components
- `components/modal/index.ts` - Modal component exports (Active)
- `components/modal/add-interview-modal.tsx` - Add interview form modal (Active)
- `components/modal/edit-interview-metadata-modal.tsx` - Edit interview modal (Active)
- `components/modal/persona-assignment-modal.tsx` - Assign persona modal (Active)
- `components/modal/persona-criteria-modal.tsx` - Edit criteria modal (Active)
- `components/modal/miso-knowledge-status-modal.tsx` - Knowledge sync status (Active)

### Persona Components
- `components/persona/index.ts` - Persona component exports (Active)
- `components/persona/persona-card.tsx` - Individual persona card (Active)
- `components/persona/persona-card-grid.tsx` - Persona grid layout (Active)
- `components/persona/persona-header.tsx` - Persona page header (Active)
- `components/persona/persona-switcher.tsx` - Persona dropdown selector (Active)

### Project Components
- `components/project/index.ts` - Project component exports (Active)
- `components/project/pages/index.ts` - Project page exports (Active)
- `components/project/pages/project-page-content.tsx` - Projects list page (Active)
- `components/project/pages/project-detail-content.tsx` - Project detail page (Active)
- `components/project/components/project-card.tsx` - Project card component (Active)
- `components/project/components/project-skeleton.tsx` - Loading skeleton (Active)
- `components/project/components/project-search-bar.tsx` - Project search (Active)
- `components/project/components/create-project-dialog.tsx` - Create project form (Active)
- `components/project/components/join-project-dialog.tsx` - Join project flow (Active)
- `components/project/components/invite-member-dialog.tsx` - Invite members (Active)
- `components/project/sections/project-grid.tsx` - Project grid layout (Active)
- `components/project/sections/project-header.tsx` - Project header (Active)
- `components/project/project-sidebar.tsx` - Project navigation sidebar (Active)
- `components/project/tabs/index.ts` - Project tab exports (Active)
- `components/project/tabs/project-interviews-polling.tsx` - Interview list tab (Active)
- `components/project/tabs/project-insights.tsx` - Insights tab (Active)
- `components/project/tabs/project-settings.tsx` - Settings tab (Active)

### Search Components
- `components/search/index.ts` - Search component exports (Active)
- `components/search/search-bar.tsx` - Global search bar (Active)
- `components/search/search-result.tsx` - Search result item (Active)

### Shared Components
- `components/shared/index.ts` - Shared component exports (Active)
- `components/shared/navigation.tsx` - App navigation bar (Active)
- `components/shared/theme-provider.tsx` - Theme context provider (Active)
- `components/shared/mode-toggle.tsx` - Dark/light mode toggle (Active)
- `components/shared/mobile-not-supported.tsx` - Mobile warning (Active)
- `components/shared/skeleton-card-grid.tsx` - Loading skeleton grid (Active)
- `components/shared/tag-list.tsx` - Tag display component (Active)

### UI Components (shadcn/ui)
- `components/ui/index.ts` - UI component exports (Active)
- `components/ui/accordion.tsx` - Accordion component (Active)
- `components/ui/alert.tsx` - Alert component (Active)
- `components/ui/alert-dialog.tsx` - Alert dialog modal (Active)
- `components/ui/aspect-ratio.tsx` - Aspect ratio container (Active)
- `components/ui/avatar.tsx` - Avatar component (Active)
- `components/ui/badge.tsx` - Badge component (Active)
- `components/ui/breadcrumb.tsx` - Breadcrumb navigation (Active)
- `components/ui/button.tsx` - Button component (Active)
- `components/ui/calendar.tsx` - Calendar picker (Active)
- `components/ui/card.tsx` - Card container (Active)
- `components/ui/carousel.tsx` - Carousel component (Active)
- `components/ui/chart.tsx` - Chart wrapper (Active)
- `components/ui/checkbox.tsx` - Checkbox input (Active)
- `components/ui/collapsible.tsx` - Collapsible panel (Active)
- `components/ui/command.tsx` - Command palette (Active)
- `components/ui/context-menu.tsx` - Context menu (Active)
- `components/ui/dialog.tsx` - Dialog modal (Active)
- `components/ui/drawer.tsx` - Drawer component (Active)
- `components/ui/dropdown-menu.tsx` - Dropdown menu (Active)
- `components/ui/form.tsx` - Form components (Active)
- `components/ui/hover-card.tsx` - Hover card (Active)
- `components/ui/input.tsx` - Text input (Active)
- `components/ui/input-otp.tsx` - OTP input (Active)
- `components/ui/label.tsx` - Form label (Active)
- `components/ui/menubar.tsx` - Menu bar (Active)
- `components/ui/navigation-menu.tsx` - Navigation menu (Active)
- `components/ui/pagination.tsx` - Pagination controls (Active)
- `components/ui/popover.tsx` - Popover component (Active)
- `components/ui/progress.tsx` - Progress bar (Active)
- `components/ui/radio-group.tsx` - Radio button group (Active)
- `components/ui/resizable.tsx` - Resizable panels (Active)
- `components/ui/scroll-area.tsx` - Scrollable area (Active)
- `components/ui/select.tsx` - Select dropdown (Active)
- `components/ui/separator.tsx` - Visual separator (Active)
- `components/ui/sheet.tsx` - Sheet panel (Active)
- `components/ui/sidebar.tsx` - Sidebar component (Active)
- `components/ui/skeleton.tsx` - Loading skeleton (Active)
- `components/ui/slider.tsx` - Slider input (Active)
- `components/ui/switch.tsx` - Toggle switch (Active)
- `components/ui/table.tsx` - Table components (Active)
- `components/ui/tabs.tsx` - Tab components (Active)
- `components/ui/textarea.tsx` - Textarea input (Active)
- `components/ui/toast.tsx` - Toast notification (Active)
- `components/ui/toaster.tsx` - Toast container (Active)
- `components/ui/toggle.tsx` - Toggle button (Active)
- `components/ui/toggle-group.tsx` - Toggle button group (Active)
- `components/ui/tooltip.tsx` - Tooltip component (Active)
- `components/ui/sonner.tsx` - Sonner toast integration (Active)

### Custom UI Components
- `components/ui/page-transition.tsx` - Page transition wrapper (Active)
- `components/ui/error-display.tsx` - Error message display (Active)
- `components/ui/floating-memo-button.tsx` - Floating action button (Active)
- `components/ui/ai-question-bar.tsx` - AI question input (Active)
- `components/ui/ai-response-dialog.tsx` - AI response display (Active)
- `components/ui/ai-exit-confirmation.tsx` - Exit confirmation dialog (Active)

### Provider Components
- `components/providers/query-provider.tsx` - TanStack Query provider (Active)

## Hooks Directory

### Core Hooks
- `hooks/use-auth.tsx` - Authentication state management (Active)
  - Dependencies: Supabase auth, auth cache
- `hooks/use-standard-query.ts` - Standardized query pattern (Active)
- `hooks/use-toast.ts` - Toast notification hook (Active)
- `hooks/use-debounce.ts` - Debounce utility hook (Active)
- `hooks/use-is-client.ts` - Client-side detection (Active)
- `hooks/use-mobile.ts` - Mobile detection hook (Active)

### Feature Hooks
- `hooks/use-personas.ts` - Persona data management (Active)
- `hooks/use-projects.ts` - Project data management (Active)
- `hooks/use-project-insights.ts` - Project insights data (Active)
- `hooks/use-persona-definitions.ts` - Persona definitions (Active)
- `hooks/use-interview-persona.ts` - Interview persona assignment (Active)
- `hooks/use-interview-status-monitor.ts` - Interview status tracking (Active)

### Real-time Hooks
- `hooks/use-interview-notes.ts` - Real-time interview notes (Active)
- `hooks/use-interview-notes-polling.ts` - Notes polling fallback (Active)
- `hooks/use-interviews-polling.ts` - Interviews polling (Active)

## Lib Directory

### API Client
- `lib/api/index.ts` - API client exports (Active)
- `lib/api/base.ts` - Base API client with auth (Active)
- `lib/api/auth.ts` - Authentication API calls (Active)
- `lib/api/interviews.ts` - Interview API calls (Active)
- `lib/api/personas.ts` - Persona API calls (Active)
- `lib/api/persona-criteria.ts` - Criteria API calls (Active)
- `lib/api/projects.ts` - Project API calls (Active)

### Configuration
- `lib/config/index.ts` - Config exports (Active)
- `lib/config/api.ts` - API configuration (Active)
- `lib/config/defaults.ts` - Default values (Active)
- `lib/config/ui.ts` - UI configuration (Active)
- `lib/config/upload.ts` - File upload config (Active)
- `lib/config/workflow.ts` - Workflow config (Active)

### Constants (Legacy)
- `lib/constants/index.ts` - Constants exports (Active)
- `lib/constants/api.ts` - API constants (Active)
- `lib/constants/config.ts` - Config constants (Active)
- `lib/constants/file-upload.ts` - Upload constants (Active)
- `lib/constants/messages.ts` - UI messages (Active)
- `lib/constants/routes.ts` - Route constants (Active)

### Error Handling
- `lib/errors/index.ts` - Error exports (Active)
- `lib/errors/api-error.ts` - API error class (Active)
- `lib/errors/auth-error.ts` - Auth error class (Active)
- `lib/errors/validation-error.ts` - Validation error (Active)

### Services

#### MISO Integration
- `lib/services/miso/index.ts` - MISO exports (Active)
- `lib/services/miso/api.ts` - MISO API client (Active)
- `lib/services/miso/parser.ts` - Response parser (Active)
- `lib/services/miso/workflow.ts` - Workflow sync (Active)
- `lib/services/miso/__tests__/api.test.ts` - API tests (Test)
- `lib/services/miso/__tests__/parser.test.ts` - Parser tests (Test)
- `lib/services/miso/__tests__/workflow.test.ts` - Workflow tests (Test)

#### Feature Services
- `lib/services/insights/index.ts` - Insights exports (Active)
- `lib/services/insights/insights.service.ts` - Insights logic (Active)
- `lib/services/insights/types.ts` - Insights types (Active)
- `lib/services/personas/index.ts` - Persona exports (Active)
- `lib/services/personas/personas.service.ts` - Persona logic (Active)
- `lib/services/personas/types.ts` - Persona types (Active)
- `lib/services/projects/index.ts` - Project exports (Active)
- `lib/services/projects/projects.service.ts` - Project logic (Active)
- `lib/services/projects/types.ts` - Project types (Active)
- `lib/services/project-insights.service.ts` - Project insights (Active)

### Utilities
- `lib/utils/index.ts` - Utils exports (Active)
- `lib/utils/auth-cache.ts` - Auth caching layer (Active)
- `lib/utils/cn.ts` - Class name utility (Active)
- `lib/utils/date.ts` - Date formatting (Active)
- `lib/utils/file.ts` - File utilities (Active)
- `lib/utils/format.ts` - Text formatting (Active)
- `lib/utils/mention.ts` - Mention parsing (Active)
- `lib/utils/persona.ts` - Persona utilities (Active)
- `lib/utils/validation.ts` - Input validation (Active)
- `lib/utils/client-file-parser.ts` - Client file parse (Active)
- `lib/utils/server-file-parser.ts` - Server file parse (Active)
- `lib/utils/__tests__/auth-cache.test.ts` - Cache tests (Test)
- `lib/utils/__tests__/file.test.ts` - File util tests (Test)
- `lib/utils/__tests__/mention.test.ts` - Mention tests (Test)

### Core Libraries
- `lib/supabase.ts` - Supabase client (Active)
- `lib/supabase-server.ts` - Server Supabase (Active)
- `lib/query-client.ts` - TanStack Query setup (Active)
- `lib/query-keys.ts` - Query key factory (Active)
- `lib/miso-knowledge.ts` - MISO knowledge API (Active)

### Data
- `lib/data/persona-data.ts` - Persona mock data (Active)

## Types Directory

### Core Types
- `types/index.ts` - Type exports (Active)
- `types/supabase.ts` - Generated Supabase types (Active)
- `types/database.ts` - Database type extensions (Active)
- `types/env.d.ts` - Environment type definitions (Active)

### Domain Types
- `types/api.ts` - API response types (Active)
- `types/api/personas.ts` - Persona API types (Active)
- `types/api/projects.ts` - Project API types (Active)
- `types/business.ts` - Business logic types (Active)
- `types/components.ts` - Component prop types (Active)
- `types/insights.ts` - Insights types (Active)
- `types/interview.ts` - Interview types (Active)
- `types/interview-notes.ts` - Note types (Active)
- `types/interviewee.ts` - Interviewee types (Active)
- `types/persona.ts` - Persona types (Active)
- `types/persona-criteria.ts` - Criteria types (Active)
- `types/persona-definition.ts` - Definition types (Active)
- `types/project.ts` - Project types (Active)
- `types/workflow.ts` - Workflow types (Active)

## Documentation Directory

### Real-time System Docs
- `docs/REALTIME_ARCHITECTURE.md` - Real-time system design (Active)
- `docs/REALTIME_COMMUNICATION_STANDARDS.md` - Communication standards (Active)
- `docs/REALTIME_COMPARISON.md` - Technology comparison (Active)
- `docs/REALTIME_FIX_SUMMARY.md` - Bug fix summary (Active)
- `docs/REALTIME_IMPROVEMENT_ROADMAP.md` - Future improvements (Active)
- `docs/REALTIME_MIGRATION_COMPLETE.md` - Migration summary (Active)
- `docs/REALTIME_OPTIMIZATION_GUIDE.md` - Performance guide (Active)
- `docs/BROADCAST_MIGRATION_GUIDE.md` - Broadcast migration (Active)
- `docs/BROADCAST_ACTION_FIX.md` - Broadcast fix docs (Active)

### Implementation Docs
- `docs/SSE_IMPLEMENTATION_GUIDE.md` - SSE implementation (Active)
- `docs/SSE_PRESENCE_IMPLEMENTATION.md` - SSE presence system (Active)
- `docs/PHASE1_IMPLEMENTATION_SUMMARY.md` - Phase 1 summary (Active)
- `docs/PHASE2_ADAPTIVE_STRATEGY_PLAN.md` - Phase 2 plan (Active)
- `docs/INTERVIEW_NOTES_SUBSCRIPTION_FIX.md` - Notes fix (Active)
- `docs/INTERVIEWS_UPDATE_ANALYSIS.md` - Update analysis (Active)
- `docs/HOISTING_FIX.md` - React hoisting fix (Active)

### MISO API Docs
- `docs/miso/.yml/persona_insight_agent.yml` - Agent config (Active)
- `docs/miso/.yml/persona_insight_workflow.yml` - Workflow config (Active)
- `docs/miso/api_guide/miso_api_guide_agent.md` - Agent API guide (Active)
- `docs/miso/api_guide/miso_api_guide_agent,chatflow.md` - Chatflow guide (Active)
- `docs/miso/api_guide/miso_api_guide_knowledge.md` - Knowledge API (Active)

## Database Migrations

### Supabase Migrations
- `supabase/migrations/20240101000000_profiles_rls_policy.sql` - Profile RLS (Active)
- `supabase/migrations/20240101000001_add_created_by_name_to_interviews.sql` - Interview creator (Active)
- `supabase/migrations/20240620_add_performance_indexes.sql` - Performance indexes (Active)
- `supabase/migrations/20240621000000_add_performance_indexes.sql` - More indexes (Active)
- `supabase/migrations/20240621000001_add_rpc_functions.sql` - RPC functions (Active)
- `supabase/migrations/20250130_enable_realtime_interviews.sql` - Realtime interviews (Active)
- `supabase/migrations/20250131_enable_realtime_note_replies.sql` - Realtime replies (Active)
- `supabase/migrations/20250201_enable_realtime_interview_replies.sql` - Interview replies (Active)
- `supabase/migrations/20250201_fix_realtime_delete_events.sql` - Delete event fix (Active)

## Test Files

### Test Configuration
- `test/setup.ts` - Test environment setup (Test)
- `vitest.config.ts` - Vitest configuration (Test)

### Component Tests
- `components/chat/__tests__/chat-interface.test.tsx` - Chat tests (Test)

### Service Tests
- `lib/services/miso/__tests__/api.test.ts` - MISO API tests (Test)
- `lib/services/miso/__tests__/parser.test.ts` - Parser tests (Test)
- `lib/services/miso/__tests__/workflow.test.ts` - Workflow tests (Test)

### Utility Tests
- `lib/utils/__tests__/auth-cache.test.ts` - Auth cache tests (Test)
- `lib/utils/__tests__/file.test.ts` - File utility tests (Test)
- `lib/utils/__tests__/mention.test.ts` - Mention system tests (Test)

## Public Directory (Static Assets)
Note: Public directory files not listed in the initial scan but typically includes:
- Favicon files
- Static images
- Manifest files
- Robots.txt

## File Status Summary
- **Active**: 385 files - Currently in use
- **Test**: 9 files - Test suite files
- **Deprecated**: 0 files - No deprecated files identified

## Key Dependencies & Relationships

### Core Dependencies
1. **Authentication Flow**:
   - `app/api/auth/*` → `lib/supabase.ts` → `hooks/use-auth.tsx`
   - `lib/utils/auth-cache.ts` reduces auth lookups

2. **Interview Processing Pipeline**:
   - `app/api/workflow/*` → `lib/services/miso/*` → `lib/utils/server-file-parser.ts`
   - Known performance issue in workflow route

3. **Real-time Collaboration**:
   - `hooks/use-interview-notes.ts` → Supabase Realtime subscriptions
   - Broadcast events for presence tracking

4. **Persona Management**:
   - `app/api/personas/*` → `lib/services/personas/*` → MISO Knowledge Base
   - Synthesis and synchronization workflows

5. **Project System**:
   - `app/api/projects/*` → `lib/services/projects/*` → Role-based access
   - Public/private project support with join flows

## Notes
- The codebase follows a clear separation between API routes, services, and UI components
- Heavy use of TypeScript for type safety throughout
- Real-time features built on Supabase's real-time subscriptions
- Performance optimizations needed in workflow processing (N+1 queries)
- Comprehensive test coverage for critical services
- Well-documented architecture with extensive markdown docs