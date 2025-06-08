'use client'

import { useAuth } from '@/hooks/use-auth'

export default function CompanyBranding() {
  const { user, profile, error } = useAuth()
  
  // 에러가 있거나 프로필이 없는 경우 기본값 사용
  const companyName = (!error && user && profile?.company?.name) 
    ? profile.company.name 
    : 'MISO'
  
  return (
    <span className="ml-2 text-xs text-muted-foreground">
      by {companyName}
    </span>
  )
} 