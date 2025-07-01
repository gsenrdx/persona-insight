import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'
import { Database } from '@/types/database'
import { Interview } from '@/types/interview'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    },
    global: {
      fetch: fetch
    },
    realtime: {
      disabled: true
    }
  }
)

// CRUD operations for interview data

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const category = searchParams.get('category') // painpoint, needs, all
    const searchTerm = searchParams.get('search')
    
    // 인증 처리 - 두 가지 방법 지원
    let companyId: string
    const urlCompanyId = searchParams.get('company_id')
    const authorization = request.headers.get('authorization')
    
    if (authorization) {
      // Authorization 헤더가 있으면 사용
      const { companyId: authCompanyId } = await getAuthenticatedUserProfile(authorization, supabase)
      companyId = authCompanyId
    } else if (urlCompanyId) {
      // URL 파라미터로 company_id가 전달되면 사용 (레거시 지원)
      companyId = urlCompanyId
    } else {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 기본 쿼리
    let query = supabase
      .from('interviews')
      .select(`
        *,
        created_by_profile:profiles!interviews_created_by_fkey(id, name),
        persona:personas!interviews_persona_id_fkey(id, persona_type, persona_title),
        ai_persona_definition:persona_definitions!interviews_ai_persona_match_fkey(id, name_ko, name_en, description, tags),
        interview_notes(id, is_deleted)
      `)
      .eq('company_id', companyId)
      .order('interview_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // 프로젝트 필터링
    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    // 카테고리 필터링 - 새로운 스키마에 맞게 수정
    // cleaned_script 배열에서 category 필드를 확인
    if (category && category !== 'all') {
      // JSONB 배열에서 특정 category를 포함하는 레코드 필터링
      query = query.filter('cleaned_script', 'cs', { any: [{ category }] })
    }

    // 검색어 필터링 (cleaned_script에서 검색)
    if (searchTerm) {
      query = query.textSearch('cleaned_script', searchTerm, {
        type: 'websearch',
        config: 'korean'
      })
    }

    const { data: interviews, error } = await query

    if (error) {
      return NextResponse.json({
        error: '인터뷰 데이터를 가져오는데 실패했습니다',
        details: error.message,
        success: false
      }, { status: 500 })
    }

    // 메모 수 계산하여 추가 (삭제되지 않은 메모만 카운트)
    const interviewsWithNoteCount = interviews?.map(interview => ({
      ...interview,
      note_count: interview.interview_notes?.filter(note => !note.is_deleted).length || 0,
      interview_notes: undefined // 실제 메모 데이터는 제거하고 카운트만 전달
    })) || []

    return NextResponse.json({
      data: interviewsWithNoteCount,
      success: true
    })
  } catch (error) {
    return NextResponse.json({
      error: '인터뷰 데이터를 가져오는데 실패했습니다',
      success: false
    }, { status: 500 })
  }
}

// 새 인터뷰 생성 - workflow에서 호출됨
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabase)
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('interviews')
      .insert([{
        ...body,
        company_id: companyId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: '인터뷰 데이터 저장에 실패했습니다',
        details: error.message,
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      data,
      success: true
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({
      error: '인터뷰 데이터 저장에 실패했습니다',
      success: false
    }, { status: 500 })
  }
}