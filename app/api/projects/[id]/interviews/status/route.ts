import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'
import type { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/projects/[id]/interviews/status - 폴링 최적화된 상태 체크
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    
    // 폴링 호출 로깅 (개발용 - 운영에서 제거)
    // console.log('[STATUS-POLL]', { projectId, timestamp: new Date().toISOString() })
    
    // 인증 처리
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { userId } = await getAuthenticatedUserProfile(authorization, supabase)
    
    // 프로젝트 멤버 확인
    const { data: member } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()
      
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // 상태 체크에 최적화된 최소 필드만 조회
    const { data: interviews, error } = await supabase
      .from('interviews')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        created_by
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 상태 통계 계산
    const stats = interviews?.reduce((acc, interview) => {
      const status = interview.status || 'pending'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    return NextResponse.json({ 
      data: interviews || [],
      stats,
      metadata: {
        total: interviews?.length || 0,
        processingCount: stats.processing || 0,
        completedCount: stats.completed || 0,
        failedCount: stats.failed || 0,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    // console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}