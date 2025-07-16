import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'
import type { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/projects/[id]/interviews - 프로젝트의 인터뷰 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    
    // 인증 처리
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabase)
    
    // 프로젝트 멤버 확인
    const { data: member } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()
      
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // 쿼리 파라미터 확인
    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const deletedOnly = searchParams.get('deletedOnly') === 'true'
    
    // 인터뷰 목록 조회 (페르소나 정보 포함)
    let query = supabase
      .from('interviews')
      .select(`
        *,
        created_by_profile:profiles!interviews_created_by_fkey(id, name),
        persona_combination:persona_combinations(
          id, 
          persona_code, 
          type_ids,
          title,
          description
        ),
        interview_notes(count)
      `)
      .eq('project_id', projectId)
    
    // 필터링 조건 적용
    if (deletedOnly) {
      query = query.not('deleted_at', 'is', null)
    } else if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }
    
    const { data: interviews, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 효율적인 타입 정보 배치 조회 (N+1 문제 해결)
    let typeDataMap = new Map()
    
    if (interviews && interviews.length > 0) {
      // 모든 인터뷰의 type_ids를 미리 수집
      const allTypeIds = [...new Set(
        interviews
          .filter(i => i.persona_combination?.type_ids)
          .flatMap(i => i.persona_combination.type_ids || [])
      )]
      
      if (allTypeIds.length > 0) {
        // 한 번의 쿼리로 모든 타입 정보 조회
        const { data: types } = await supabase
          .from('persona_classification_types')
          .select(`
            id,
            name,
            description,
            persona_classifications(
              name,
              description
            )
          `)
          .in('id', allTypeIds)
        
        // 빠른 조회를 위한 Map 생성
        if (types) {
          types.forEach(type => {
            typeDataMap.set(type.id, type)
          })
        }
      }
    }
    
    // 데이터 변환 (메모리 기반 매핑으로 최적화)
    const transformedInterviews = interviews?.map(interview => {
      const combination = interview.persona_combination
      
      // 메모리 기반 타입 정보 매핑 (O(1) 조회)
      if (combination && combination.type_ids && typeDataMap.size > 0) {
        combination.persona_classification_types = combination.type_ids
          .map(typeId => typeDataMap.get(typeId))
          .filter(Boolean)
      }
      
      return {
        ...interview,
        interview_notes: interview.interview_notes?.[0]?.count || 0
      }
    })
    
    return NextResponse.json({ 
      data: transformedInterviews || [],
      metadata: {
        total: transformedInterviews?.length || 0,
        memberRole: member.role
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}