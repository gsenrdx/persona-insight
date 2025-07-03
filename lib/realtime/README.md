# Realtime WebSocket System

## Architecture

The realtime system is built with a modular architecture:

```
lib/realtime/
├── core/                          # Core modules
│   ├── connection-manager.ts      # WebSocket connection lifecycle
│   ├── channel-registry.ts        # Channel management (singleton)
│   ├── data-sync-manager.ts       # Data synchronization
│   └── presence-manager.ts        # Presence tracking
├── improved-realtime-provider.tsx # Main provider component
├── compatibility-shim.ts          # Backward compatibility
├── interview-realtime-wrapper.tsx # Wrapper component
├── types.ts                       # Type definitions
└── index.ts                       # Public exports
```

## Usage

### Basic Setup

```tsx
// In your root layout or app wrapper
import { InterviewRealtimeWrapper } from '@/lib/realtime'

export default function Layout({ children }) {
  return (
    <InterviewRealtimeWrapper>
      {children}
    </InterviewRealtimeWrapper>
  )
}
```

### Using Hooks

```tsx
// New API (recommended)
import { useImprovedRealtime, useRealtimeInterviews } from '@/lib/realtime'

function MyComponent() {
  const { connectionState, subscribeToProject } = useImprovedRealtime()
  const interviews = useRealtimeInterviews()
  
  useEffect(() => {
    subscribeToProject(projectId)
  }, [projectId])
  
  // Use interviews data...
}
```

### Legacy API (compatibility mode)

```tsx
// Old API still works via compatibility shim
import { useInterviewRealtime, useInterviews } from '@/lib/realtime'

function LegacyComponent() {
  const { isSubscribed, interviews } = useInterviewRealtime()
  // Works exactly as before
}
```

## Key Features

1. **Persistent Channels**: Channels persist per company, not per project
2. **Smart Lifecycle**: Reference counting for efficient management
3. **Auto Cleanup**: Idle channels cleaned after 30 minutes
4. **Resource Protection**: Maximum 50 channels limit
5. **Batch Processing**: 100ms debouncing for performance
6. **Connection Recovery**: Exponential backoff reconnection

## Migration from Legacy

The system provides full backward compatibility. Existing code continues to work without changes. To migrate:

1. Replace `useInterviewRealtime` with `useImprovedRealtime`
2. Update hook names (e.g., `useInterviews` → `useRealtimeInterviews`)
3. Remove manual broadcast events (now automatic)

## Debugging

```javascript
// Check channel status in console
import { channelRegistry } from '@/lib/realtime'
console.log(channelRegistry.getChannelStats())
```