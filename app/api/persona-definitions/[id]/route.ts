import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

// 페르소나 정의 수정
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

    // 사용자 정보 및 권한 확인
    const { role } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    if (role !== 'super_admin' && role !== 'company_admin') {
      return NextResponse.json(
        { error: '페르소나 정의 수정 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 요청 바디 파싱
    const body = await req.json()
    const { name_ko, name_en, description, tags, evolution_path } = body

    // 필수 필드 검증
    if (!name_ko || !name_en) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      )
    }

    // 페르소나 정의 업데이트
    const { data, error } = await supabaseAdmin
      .from('persona_definitions')
      .update({
        name_ko,
        name_en,
        description,
        tags,
        evolution_path,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: '페르소나 정의 수정에 실패했습니다', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: '해당 페르소나 정의를 찾을 수 없습니다' },
        { status: 404 }
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