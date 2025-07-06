# BroadcastAction ReferenceError Fix

## Issue
`ReferenceError: BroadcastAction is not defined` when calling `MessageFactory.presenceAction()`

## Root Cause
TypeScript type-only imports (`import type { BroadcastAction }`) are removed at runtime, but the code was trying to use `BroadcastAction.CREATE`, `BroadcastAction.UPDATE`, etc. as actual enum values.

## Fix Applied
Changed type-only imports to regular imports in files that use BroadcastAction at runtime:

### 1. `/lib/realtime/broadcast/utils/message-factory.ts`
```typescript
// Before
import type { BroadcastAction } from '../types'

// After  
import { BroadcastAction } from '../types'
```

### 2. `/lib/realtime/broadcast/handlers/interview-note-handler.ts`
```typescript
// Before
import type { BroadcastAction } from '../types'

// After
import { BroadcastAction } from '../types'
```

## Why This Works
- `BroadcastAction` is an enum defined in `base.types.ts`
- Enums in TypeScript exist at runtime (they compile to JavaScript objects)
- Type-only imports are completely removed during compilation
- Regular imports preserve the enum object for runtime use

## Files Checked
✅ message-factory.ts - Fixed (uses BroadcastAction.CREATE, etc.)
✅ interview-note-handler.ts - Fixed (uses in switch statements)
✅ base-handler.ts - OK (only uses as type)
✅ interview.types.ts - OK (only uses as type)
✅ base.types.ts - OK (defines the enum)

The error should now be resolved!