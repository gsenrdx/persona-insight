// Project-level presence components
export { 
  ProjectPresenceIndicatorCompact,
  ProjectPresenceIndicatorDetailed 
} from './project-presence-indicator'

// Google-style simple presence (main presence component)
export { GoogleStylePresence } from './google-style-presence'

// Types and utilities
export type {
  GlobalPresencePayload,
  ProjectPresencePayload,
  ActivityType,
  LocationType
} from '@/lib/realtime/broadcast/types/global-presence.types'

export {
  getUserActivityIcon,
  getLocationDisplayName,
  isUserActive
} from '@/lib/realtime/broadcast/types/global-presence.types'