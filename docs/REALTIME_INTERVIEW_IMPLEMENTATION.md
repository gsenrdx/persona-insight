# Supabase Realtime Interview Implementation

## Overview
인터뷰 관련 기능을 React Query 캐싱에서 Supabase Realtime 기반으로 전환했습니다. 이로써 여러 사용자가 동시에 인터뷰를 보고 편집할 때 실시간으로 동기화됩니다.

## Key Changes

### 1. New Files Created
- `/lib/realtime/interview-realtime-provider.tsx` - Realtime context provider
- `/hooks/use-interviews-realtime.ts` - Realtime hooks for interviews
- `/hooks/use-interview-notes-realtime.ts` - Realtime hooks for notes
- `/components/project/tabs/project-interviews-realtime.tsx` - New realtime component
- `/supabase/migrations/20250130_enable_realtime_interviews.sql` - Database migration

### 2. Architecture Changes
- **Before**: React Query + WebSocket hybrid approach
- **After**: Pure Supabase Realtime with Postgres Changes, Presence, and Broadcast

### 3. Features Implemented

#### Postgres Changes
- Automatic sync when interviews are created/updated/deleted
- Automatic sync when notes are added/edited/removed
- Row-level security policies for proper access control

#### Presence
- See who's currently viewing an interview
- Real-time user count display
- Online/offline status tracking

#### Broadcast
- Custom events for user actions
- Low-latency updates between clients
- Optimistic UI updates

### 4. Migration Steps

1. Apply the database migration to enable Realtime:
```bash
supabase migration up
```

2. Update the project detail page to use the new component:
```tsx
import ProjectInterviews from '@/components/project/tabs/project-interviews-realtime'
```

3. Wrap components with the provider:
```tsx
<InterviewRealtimeProvider>
  <YourComponent />
</InterviewRealtimeProvider>
```

## Testing Multi-User Synchronization

1. Open the same project in multiple browser tabs/windows
2. Create/edit/delete interviews in one tab
3. Observe real-time updates in other tabs
4. Check presence indicators when multiple users view the same interview
5. Test note collaboration with concurrent edits

## Performance Benefits

- **No polling**: Updates are pushed instantly
- **Reduced server load**: No periodic refetch queries
- **Better UX**: Instant feedback for all users
- **Conflict-free**: Database handles concurrent updates

## Rollback Plan

If issues occur, you can rollback by:
1. Reverting to `project-interviews-new.tsx` component
2. Uncommenting interview query keys in `/lib/query-keys.ts`
3. Disabling Realtime in the database:
```sql
ALTER PUBLICATION supabase_realtime DROP TABLE interviewees;
ALTER PUBLICATION supabase_realtime DROP TABLE interview_notes;
```

## Next Steps

1. Monitor performance in production
2. Add error recovery for connection failures
3. Implement offline support with local storage
4. Extend to other features (personas, projects, etc.)