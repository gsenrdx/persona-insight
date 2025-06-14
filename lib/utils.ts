// Legacy utils.ts file - maintained for backward compatibility
// New utils are organized in the /lib/utils/ directory

// Re-export all utilities from the new structure
export * from './utils/index'

// Keep the direct cn export for legacy compatibility
export { cn } from './utils/cn'
