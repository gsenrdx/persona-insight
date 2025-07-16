import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

// 페르소나 정의 목록 조회
export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 인증 확인 - 로그인된 사용자면 누구나 조회 가능
    await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    // 페르소나 정의 조회
    const { data, error } = await supabaseAdmin
      .from('persona_definitions')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: '페르소나 정의를 불러오는데 실패했습니다', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: data || [],
      success: true 
    })
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}