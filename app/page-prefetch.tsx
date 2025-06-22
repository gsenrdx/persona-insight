"use client"

import { useEffect } from 'react'
import { useProjects } from '@/hooks/use-projects'
import { useAuth } from '@/hooks/use-auth'

/**
 * 메인 페이지에서 프로젝트 데이터를 프리페칭하는 컴포넌트
 * 백그라운드에서 프로젝트 데이터를 미리 가져와 네비게이션 시 빠른 응답을 제공
 */
export function PagePrefetch() {
  const { profile } = useAuth()
  
  // 프로젝트 데이터 프리페칭
  const { data: projects } = useProjects({
    companyId: profile?.company_id,
    userId: profile?.id
  }, {
    enabled: !!profile?.company_id && !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    refetchOnMount: false
  })

  useEffect(() => {
    if (projects && projects.length > 0) {
      // 프로젝트 데이터가 로드되면 콘솔에 프리페치 완료 메시지 (디버깅용)
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Prefetch] ${projects.length}개의 프로젝트 데이터 프리페치 완료`)
      }
    }
  }, [projects])

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null
}