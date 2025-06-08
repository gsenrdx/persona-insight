'use client'

import { useAuth } from '@/hooks/use-auth'

export default function CompanyBranding() {
  const { user, profile } = useAuth()
  
  const companyName = user && profile?.company?.name 
    ? profile.company.name 
    : 'MISO'
  
  return (
    <span className="ml-2 text-xs text-muted-foreground">
      by {companyName}
    </span>
  )
} 