import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

// PUT: 용어 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = req.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    // 회사에 속한 사용자인지만 확인 (모든 회사 사용자가 수정 가능)

    const body = await req.json()
    const { term, definition } = body

    if (!term?.trim() || !definition?.trim()) {
      return NextResponse.json(
        { error: '용어와 정의는 필수 입력 사항입니다' },
        { status: 400 }
      )
    }

    // 먼저 해당 용어가 존재하고 같은 회사의 용어인지 확인
    const { data: existingTerm, error: checkError } = await supabaseAdmin
      .from('glossary')
      .select('company_id')
      .eq('id', params.id)
      .single()

    if (checkError || !existingTerm) {
      return NextResponse.json(
        { error: '용어를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (existingTerm.company_id !== companyId) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('glossary')
      .update({
        term: term.trim(),
        definition: definition.trim(),
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        id,
        term,
        definition,
        created_at,
        updated_at,
        created_by,
        updated_by,
        creator:profiles!glossary_created_by_fkey(name),
        updater:profiles!glossary_updated_by_fkey(name)
      `)
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: '이미 존재하는 용어입니다' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: '용어 수정에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// DELETE: 용어 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = req.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    // 회사에 속한 사용자인지만 확인 (모든 회사 사용자가 삭제 가능)

    // 먼저 해당 용어가 존재하고 같은 회사의 용어인지 확인
    const { data: existingTerm, error: checkError } = await supabaseAdmin
      .from('glossary')
      .select('company_id')
      .eq('id', params.id)
      .single()

    if (checkError || !existingTerm) {
      return NextResponse.json(
        { error: '용어를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (existingTerm.company_id !== companyId) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const { error } = await supabaseAdmin
      .from('glossary')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { error: '용어 삭제에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}