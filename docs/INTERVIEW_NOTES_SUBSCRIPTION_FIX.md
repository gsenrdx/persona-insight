# Interview Notes Multiple Subscription Fix

## Issue
`Error: Failed to initialize channel: "tried to subscribe multiple times. 'subscribe' can only be called a single time per channel instance"`

This error occurred in `use-interview-notes-broadcast.ts` when React StrictMode caused the effect to run twice, attempting to subscribe to the same channel multiple times.

## Root Causes
1. React StrictMode double-mounting components
2. Channel manager returning the same channel instance that was already subscribed
3. Aggressive cleanup removing channels immediately on unmount

## Fixes Applied

### 1. Check Channel State Before Subscribing
```typescript
// Before
await channel.subscribe()

// After
const channelState = channel.getState()
const internalState = channelState as ChannelState & { isSubscribing?: boolean }

if (!internalState.isSubscribed && !internalState.isConnected && !internalState.isSubscribing) {
  await channel.subscribe()
}
```

### 2. Use ConnectionManager for Deduplication
```typescript
// Wrap channel initialization in connectionManager
await connectionManager.subscribe(channelName, async () => {
  // Channel setup code...
})
```

### 3. Schedule Cleanup with Delay
```typescript
// Before - immediate removal
channelManager.removeChannel(channelName)

// After - scheduled cleanup
connectionManager.scheduleCleanup(channelName, async () => {
  await channelManager.removeChannel(channelName)
})
```

### 4. Update Connection State Based on Actual Channel State
```typescript
const updatedState = channel.getState()
setIsConnected(updatedState.isConnected || updatedState.isSubscribed)
```

## Benefits
- No more multiple subscription errors
- Works properly with React StrictMode
- Channels are reused when components remount quickly
- Proper cleanup without breaking active connections
- Better error handling and state management

## How It Works
1. ConnectionManager tracks active subscriptions and prevents duplicates
2. Channel state is checked before attempting to subscribe
3. Cleanup is delayed to handle StrictMode unmount/remount cycles
4. Connection state reflects actual channel status

The interview notes realtime functionality now handles React's development mode properly!