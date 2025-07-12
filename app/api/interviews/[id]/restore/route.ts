import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'
import { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/interviews/[id]/restore - 삭제된 인터뷰 복원
export async function POST(
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

    // 먼저 인터뷰가 존재하고 삭제되었는지 확인
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('id, deleted_at, deleted_by, project_id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (fetchError || !interview) {
      return NextResponse.json(
        { error: '인터뷰를 찾을 수 없습니다', success: false },
        { status: 404 }
      )
    }

    if (!interview.deleted_at) {
      return NextResponse.json(
        { error: '이미 활성 상태인 인터뷰입니다', success: false },
        { status: 400 }
      )
    }

    // 권한 확인: 삭제한 사람 또는 프로젝트 admin/owner만 복원 가능
    const canRestore = interview.deleted_by === userId
    
    if (!canRestore) {
      // 프로젝트 멤버 역할 확인
      const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', interview.project_id!)
        .eq('user_id', userId)
        .single()
      
      if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
        return NextResponse.json(
          { error: '인터뷰 복원 권한이 없습니다', success: false },
          { status: 403 }
        )
      }
    }

    // 복원 수행
    const { data, error } = await supabase
      .from('interviews')
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: '인터뷰 복원 중 오류가 발생했습니다', success: false },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: '인터뷰가 성공적으로 복원되었습니다'
    })
  } catch (error) {
    return NextResponse.json(
      { error: '인터뷰 복원 중 오류가 발생했습니다', success: false },
      { status: 500 }
    )
  }
}