import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

// GET: 회사별 용어 목록 조회
export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    const { data, error } = await supabaseAdmin
      .from('glossary')
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
      .eq('company_id', companyId)
      .order('term', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: '용어 목록을 불러오는데 실패했습니다' },
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

// POST: 새 용어 추가
export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    // 회사에 속한 사용자인지만 확인 (모든 회사 사용자가 추가 가능)

    const body = await req.json()
    const { term, definition } = body

    if (!term?.trim() || !definition?.trim()) {
      return NextResponse.json(
        { error: '용어와 정의는 필수 입력 사항입니다' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('glossary')
      .insert({
        company_id: companyId,
        term: term.trim(),
        definition: definition.trim(),
        created_by: userId,
        updated_by: userId
      })
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
        { error: '용어 추가에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}