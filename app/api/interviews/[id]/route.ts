import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'
import { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get and delete specific interview by ID

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { companyId } = await getAuthenticatedUserProfile(authorization, supabase)
    
    // 쿼리 파라미터 확인 (삭제된 항목 포함 여부)
    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

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
        )
      `)
      .eq('id', id)
      .eq('company_id', companyId)
    
    // 삭제된 항목 제외 (기본값)
    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }
    
    const { data, error } = await query.single()

    if (error || !data) {
      return NextResponse.json(
        { error: '인터뷰를 찾을 수 없습니다', success: false },
        { status: 404 }
      )
    }

    // 페르소나 조합 타입 정보를 별도로 가져오기
    if (data.persona_combination && data.persona_combination.type_ids) {
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
        .in('id', data.persona_combination.type_ids)
      
      if (types) {
        data.persona_combination.persona_classification_types = types
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { error: '인터뷰 조회 중 오류가 발생했습니다', success: false },
      { status: 500 }
    )
  }
}

// PATCH /api/interviews/[id] - 인터뷰 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { companyId } = await getAuthenticatedUserProfile(authorization, supabase)
    const body = await request.json()

    const { data, error } = await supabase
      .from('interviews')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: '인터뷰 업데이트 중 오류가 발생했습니다', success: false },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { error: '인터뷰 업데이트 중 오류가 발생했습니다', success: false },
      { status: 500 }
    )
  }
}

// DELETE /api/interviews/[id] - 인터뷰 삭제 (Soft Delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabase)
    
    // 쿼리 파라미터 확인 (영구 삭제 여부)
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'
    
    if (permanent) {
      // 영구 삭제는 관리자만 가능
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (!profile || (profile.role !== 'company_admin' && profile.role !== 'super_admin')) {
        return NextResponse.json(
          { error: '영구 삭제 권한이 없습니다', success: false },
          { status: 403 }
        )
      }
      
      // 실제 삭제 수행
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
      
      if (error) {
        return NextResponse.json(
          { error: '인터뷰 영구 삭제 중 오류가 발생했습니다', success: false },
          { status: 500 }
        )
      }
    } else {
      // Soft delete - deleted_at과 deleted_by 필드 업데이트
      const { data: updateResult, error } = await supabase
        .from('interviews')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null) // 이미 삭제된 항목은 다시 삭제할 수 없음
        .select()

      if (error) {
        return NextResponse.json(
          { error: `인터뷰 삭제 중 오류가 발생했습니다: ${error.message}`, success: false },
          { status: 500 }
        )
      }

      if (!updateResult || updateResult.length === 0) {
        return NextResponse.json(
          { error: '인터뷰를 찾을 수 없거나 이미 삭제되었습니다', success: false },
          { status: 404 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: '인터뷰 삭제 중 오류가 발생했습니다', success: false },
      { status: 500 }
    )
  }
}