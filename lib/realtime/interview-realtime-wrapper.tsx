'use client'

import { InterviewRealtimeProvider } from './interview-realtime-provider'

export function InterviewRealtimeWrapper({ children }: { children: React.ReactNode }) {
  // Always provide the context, the provider itself will handle client-side only operations
  return <InterviewRealtimeProvider>{children}</InterviewRealtimeProvider>
}