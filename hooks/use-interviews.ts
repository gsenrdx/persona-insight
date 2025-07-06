/**
 * Re-export the realtime interview hooks as the default
 * All interview operations now use the broadcast-based realtime system
 */

export * from './use-interviews.tsx'
export { default } from './use-interviews.tsx'

// Export specific hooks for backward compatibility
export {
  useInterviewsRealtime,
  useInterviewDetailRealtime,
  useAssignPersonaDefinitionToInterview,
  useInterviewsRealtime as useInterviews,
  useInterviewDetailRealtime as useInterviewDetail
} from './use-interviews.tsx'