import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from "@/lib/utils/auth-cache"
import { Database } from "@/types/database"
import { extractTextFromFileOnServer } from "@/lib/utils/server-file-parser"

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  
  let text: string;
  let projectId: string;
  let title: string;
  let fileName: string | undefined;

  // multipart/form-data 처리 (파일 업로드)
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    projectId = formData.get('projectId') as string;
    title = formData.get('title') as string;
    fileName = file?.name;

    if (!file) {
      return new Response('파일이 제공되지 않았습니다.', { status: 400 });
    }

    // 서버에서 파일 텍스트 추출
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      text = await extractTextFromFileOnServer(buffer, file.name);
    } catch (error) {
      return new Response(
        error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.', 
        { status: 400 }
      );
    }
  } else {
    // JSON 처리 (텍스트 입력)
    const body = await req.json();
    text = body.text;
    projectId = body.projectId;
    title = body.title;
  }
  
  if (!text || !text.trim()) {
    return new Response('텍스트가 제공되지 않았습니다.', { status: 400 });
  }

  if (!projectId || projectId === 'undefined' || projectId === 'null') {
    return new Response('프로젝트 ID가 제공되지 않았습니다.', { status: 400 });
  }

  // 인증 확인
  const authorization = req.headers.get('authorization')
  if (!authorization) {
    return new Response('인증 정보가 필요합니다.', { status: 401 })
  }

  // Supabase 초기화 (서버용 - realtime 완전 비활성화)
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
    // 1. 즉시 DB에 processing 상태로 저장
    const { data: insertedData, error: insertError } = await supabase
      .from('interviews')
      .insert([{
        company_id: companyId,
        project_id: projectId,
        title: title || '제목 없음',
        raw_text: text,
        status: 'processing',
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id, status')

    if (insertError) {
      return new Response(JSON.stringify({
        error: 'DB 저장 실패',
        message: insertError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const interviewId = insertedData?.[0]?.id

    // 2. 백그라운드 처리 시작 (비동기)
    // Next.js에서는 fetch를 사용하여 자체 API를 호출
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/api/workflow/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization
      },
      body: JSON.stringify({
        interviewId,
        maskedContent: text,
        userName,
        projectId
      })
    }).catch(() => {
      // 백그라운드 처리 실패 시 무시 (사용자에게는 영향 없음)
    })

    // 3. 즉시 응답 반환
    return new Response(JSON.stringify({
      success: true,
      interview_id: interviewId,
      status: 'processing',
      message: '인터뷰가 제출되었습니다. 백그라운드에서 처리 중입니다.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: '서버 오류',
      message: error.message || '처리 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}