import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from "@/lib/utils/auth-cache"
import { Database } from "@/types/database"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const interviewId = params.id
  
  if (!interviewId) {
    return new Response('인터뷰 ID가 필요합니다.', { status: 400 })
  }

  // 인증 확인
  const authorization = req.headers.get('authorization')
  if (!authorization) {
    return new Response('인증 정보가 필요합니다.', { status: 401 })
  }

  // Supabase 초기화
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 사용자 정보 가져오기
  let userProfile
  try {
    userProfile = await getAuthenticatedUserProfile(authorization, supabase)
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : '인증 처리 중 오류가 발생했습니다.', 
      { status: 401 }
    )
  }
  
  const { companyId } = userProfile

  try {
    // 인터뷰 상태 조회
    const { data, error } = await supabase
      .from('interviews')
      .select('id, status, title, created_at, updated_at, metadata')
      .eq('id', interviewId)
      .eq('company_id', companyId)
      .single()

    if (error || !data) {
      return new Response(JSON.stringify({
        error: '인터뷰를 찾을 수 없습니다.',
        message: error?.message
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 처리 시간 계산 (processing 상태인 경우)
    let processingTime = null
    if (data.status === 'processing' && data.created_at) {
      processingTime = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000)
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: data.id,
        status: data.status,
        title: data.title,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        processingTime,
        metadata: data.metadata
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: '서버 오류',
      message: error.message || '상태 조회 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}