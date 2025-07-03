'use client'

import { ImprovedRealtimeProvider } from './improved-realtime-provider'

export function InterviewRealtimeWrapper({ children }: { children: React.ReactNode }) {
  // Using the new improved realtime provider with modular architecture
  return <ImprovedRealtimeProvider>{children}</ImprovedRealtimeProvider>
}