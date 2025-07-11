import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from "@/lib/utils/auth-cache"
import { Database } from "@/types/supabase"

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { interviewId } = body

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
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false
      },
      global: {
        fetch: fetch
      }
    }
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

  const { userId, companyId, userName } = userProfile

  try {
    // 인터뷰 정보 조회
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('id, project_id, raw_text, status, metadata')
      .eq('id', interviewId)
      .eq('company_id', companyId as string)
      .single()

    if (fetchError || !interview) {
      return new Response('인터뷰를 찾을 수 없습니다.', { status: 404 })
    }

    // failed 상태가 아니면 재시도 불가
    if ('status' in interview && interview.status !== 'failed') {
      return new Response('실패한 인터뷰만 재시도할 수 있습니다.', { status: 400 })
    }

    // 상태를 processing으로 변경
    const metadata = 'metadata' in interview && typeof interview.metadata === 'object' && interview.metadata !== null ? interview.metadata : {}
    const attemptCount = ((metadata as any)?.processing_attempt || 0) + 1
    
    const { error: updateError } = await supabase
      .from('interviews')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
        metadata: {
          ...(typeof metadata === 'object' ? metadata : {}),
          processing_started_at: new Date().toISOString(),
          processing_attempt: attemptCount,
          retry_at: new Date().toISOString(),
          retry_by: userId
        } as any
      } as any)
      .eq('id', interviewId)

    if (updateError) {
      return new Response('상태 업데이트 실패', { status: 500 })
    }

    // 백그라운드 처리 재시작
    setTimeout(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/api/workflow/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authorization
          },
          body: JSON.stringify({
            interviewId,
            maskedContent: 'raw_text' in interview ? interview.raw_text : '',
            userName,
            projectId: 'project_id' in interview ? interview.project_id : ''
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          
          await supabase
            .from('interviews')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
              metadata: {
                ...(typeof metadata === 'object' ? metadata : {}),
                error: errorData.error || 'Retry failed',
                message: errorData.message || response.statusText,
                failed_at: new Date().toISOString(),
                processing_attempt: attemptCount
              } as any
            } as any)
            .eq('id', interviewId)
        }
      } catch (error: any) {
        await supabase
          .from('interviews')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            metadata: {
              ...(typeof metadata === 'object' ? metadata : {}),
              error: error.name || 'RetryError',
              message: error.message || 'Retry failed',
              failed_at: new Date().toISOString(),
              processing_attempt: attemptCount
            } as any
          } as any)
          .eq('id', interviewId)
      }
    }, 1000)

    return new Response(JSON.stringify({
      success: true,
      message: '인터뷰 처리를 다시 시작했습니다.',
      attempt: attemptCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: '서버 오류',
      message: error.message || '재시도 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}