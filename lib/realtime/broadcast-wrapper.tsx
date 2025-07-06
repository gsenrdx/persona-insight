'use client'

import { RealtimeProvider } from './index'

export function RealtimeWrapper({ children }: { children: React.ReactNode }) {
  return <RealtimeProvider>{children}</RealtimeProvider>
}