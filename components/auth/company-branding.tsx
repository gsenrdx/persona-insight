'use client'

import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

interface CompanyBrandingProps {
  className?: string
}

export default function CompanyBranding({ className }: CompanyBrandingProps) {
  const { user, profile, error } = useAuth()
  
  // 에러가 있거나 프로필이 없는 경우 기본값 사용
  const companyName = (!error && user && profile?.company?.name) 
    ? profile.company.name 
    : 'MISO'
  
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      by {companyName}
    </span>
  )
} 