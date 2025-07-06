/**
 * Unified presence system for Notion-like collaborative experience
 * 
 * This module provides a comprehensive presence system that combines:
 * - Global presence tracking across the entire application
 * - Script-level presence for real-time collaborative editing
 * - Unified UI components with consistent design
 * - Current user inclusion for complete visibility
 * 
 * @example
 * ```tsx
 * import { useUnifiedPresence, UnifiedPresenceIndicator } from '@/lib/realtime/unified-presence'
 * 
 * function MyComponent() {
 *   const { viewers, editors, totalCount } = useUnifiedPresence({
 *     interviewId: 'some-id',
 *     includeCurrentUser: true
 *   })
 *   
 *   return (
 *     <UnifiedPresenceIndicator
 *       viewers={viewers}
 *       editors={editors}
 *       totalCount={totalCount}
 *       showDetails={true}
 *     />
 *   )
 * }
 * ```
 */

// Types
export type {
  UnifiedPresenceUser,
  ActivityUpdate,
  UnifiedPresenceReturn,
  UnifiedPresenceOptions
} from './types'

export {
  ACTIVITY_PRIORITY,
  ACTIVITY_CONFIG
} from './types'

// Hooks
export { useUnifiedPresence } from './use-unified-presence'

// Components
export { GoogleStylePresence } from '@/components/presence/google-style-presence'