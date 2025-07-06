# JavaScript Hoisting Error Fix

## Issue
`ReferenceError: Cannot access 'loadInitialNotes' before initialization`

This error occurred because the `useEffect` hook was trying to reference `loadInitialNotes` in its dependency array before the function was defined.

## Root Cause
In JavaScript/TypeScript, `const` and `let` declarations are hoisted but not initialized. This creates a "temporal dead zone" where the variable exists but cannot be accessed until its declaration is evaluated.

### The Problem Flow:
1. `useEffect` is defined with `loadInitialNotes` in its dependency array
2. But `loadInitialNotes` is defined with `useCallback` AFTER the `useEffect`
3. React tries to read the dependency array when setting up the effect
4. This happens before `loadInitialNotes` is initialized → ReferenceError

## Solution Applied
Moved the `loadInitialNotes` definition BEFORE the `useEffect` that references it:

```typescript
// BEFORE: ❌ Error - loadInitialNotes referenced before initialization
useEffect(() => {
  // effect code...
}, [enabled, interviewId, user, loadInitialNotes])

const loadInitialNotes = useCallback(async () => {
  // function code...
}, [interviewId])

// AFTER: ✅ Fixed - loadInitialNotes defined before use
const loadInitialNotes = useCallback(async () => {
  // function code...
}, [interviewId])

useEffect(() => {
  // effect code...
}, [enabled, interviewId, user, loadInitialNotes])
```

## Key Takeaways
1. Always define functions/variables before referencing them in dependency arrays
2. Order matters in React hooks - dependencies must be defined first
3. This is especially important with `useCallback` and `useMemo`
4. The React linter usually catches this, but not always in complex scenarios

## Result
The interview notes hook now initializes without hoisting errors!