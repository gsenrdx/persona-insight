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

    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        created_by_profile:profiles!interviews_created_by_fkey(id, name),
        persona:personas!interviews_persona_id_fkey(id, persona_type, persona_title),
        ai_persona_definition:persona_definitions!interviews_ai_persona_match_fkey(id, name_ko, name_en, description, tags),
        confirmed_persona_definition:persona_definitions!interviews_confirmed_persona_definition_id_fkey(id, name_ko, name_en, description, tags)
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: '인터뷰를 찾을 수 없습니다', success: false },
        { status: 404 }
      )
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

// DELETE /api/interviews/[id] - 인터뷰 삭제
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

    const { companyId } = await getAuthenticatedUserProfile(authorization, supabase)

    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      return NextResponse.json(
        { error: '인터뷰 삭제 중 오류가 발생했습니다', success: false },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: '인터뷰 삭제 중 오류가 발생했습니다', success: false },
      { status: 500 }
    )
  }
}