import { NextRequest } from 'next/server'
import { createDataStreamResponse } from 'ai'

export const runtime = 'edge'
export const maxDuration = 60 // 시간 제한 60초로 연장

interface UpstreamLine {
  /** 서버가 보내는 이벤트 타입 */
  event?: 'agent_message'
  /** 누적 전체 답변 스냅샷 */
  answer?: string
  /** 기타 필드들 무시 */
  [key: string]: unknown
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return new Response('파일이 제공되지 않았습니다.', { status: 400 });
  }

  console.log('[MISO Workflow API 요청] 파일 크기:', file.size);
  console.log('[MISO Workflow API 요청] 파일명:', file.name);
  console.log('[MISO Workflow API 요청] 파일 타입:', file.type);

  // 환경변수에서 API 정보 가져오기
  const MISO_API_URL = process.env.MISO_API_URL || 'https://api.holdings.miso.gs';
  const MISO_API_KEY = process.env.MISO_API_KEY;

  if (!MISO_API_KEY) {
    console.error('⛔ MISO_API_KEY 환경변수가 설정되지 않았습니다');
    return new Response('API 키가 설정되지 않았습니다.', { status: 500 });
  }

  // 1단계: 파일을 Miso API에 직접 업로드하고 URL 받기
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);
  uploadFormData.append('user', 'persona-insight-user');
  
  try {
    const uploadResponse = await fetch(`${MISO_API_URL}/ext/v1/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MISO_API_KEY}`,
      },
      body: uploadFormData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('⛔ 파일 업로드 오류', uploadResponse.status, errorText);
      return new Response('파일 업로드 중 오류가 발생했습니다.', { status: 500 });
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('[MISO Workflow API] 파일 업로드 응답:', uploadResult);
    
    // 업로드된 파일 ID 추출
    const fileId = uploadResult.id;
    
    if (!fileId) {
      console.error('⛔ 파일 업로드 응답에서 ID를 찾을 수 없습니다');
      return new Response('파일 업로드 응답이 유효하지 않습니다', { status: 500 });
    }
    
    console.log('[MISO Workflow API] 파일 업로드 성공, ID:', fileId);

    // 파일 타입 결정
    const getFileType = (fileName: string, mimeType: string) => {
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      // 이미지 타입
      if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
        return 'image';
      }
      
      // 오디오 타입  
      if (mimeType.startsWith('audio/') || ['mp3', 'm4a', 'wav', 'webm', 'amr'].includes(extension || '')) {
        return 'audio';
      }
      
      // 비디오 타입
      if (mimeType.startsWith('video/') || ['mp4', 'mov', 'mpeg', 'mpga'].includes(extension || '')) {
        return 'video';
      }
      
      // 문서 타입 (기본값)
      return 'document';
    };

    const fileType = getFileType(file.name, file.type);
    
    // 파일 객체 정의
    const fileObject = {
      type: fileType,
      transfer_method: 'local_file',
      upload_file_id: fileId
    };
    
    // 2단계: workflow API 호출 (blocking 모드로 변경)
    const workflowResponse = await fetch(
      `${MISO_API_URL}/ext/v1/workflows/run`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MISO_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            file_input: fileObject,
            preprocess_type: 'interviewee'
          },
          mode: 'blocking', // 스트리밍 모드 대신 블로킹 모드 사용
          user: 'persona-insight-user',
          files: [fileObject]
        })
      }
    );
    
    /* 오류 처리 */
    if (!workflowResponse.ok) {
      const err = await workflowResponse.text().catch(() => '')
      console.error('⛔ Workflow API 오류', workflowResponse.status, err)
      return new Response('외부 API 오류', { status: 500 })
    }

    // 응답 결과 파싱
    const workflowResult = await workflowResponse.json();
    console.log('[MISO Workflow API] 분석 결과:', workflowResult);
    
    // 실제 API에서 반환될 응답 구조에 따라 파싱 로직 조정
    const output = workflowResult.data?.outputs || workflowResult.outputs || {}; // data 객체 내부의 outputs를 우선 확인
    
    // 분석 결과 구성 (키 이름 수정)
    const analysisResult = {
      type: output.type || "정보 없음", 
      description: output.description || "설명이 없습니다.",
      summary: output.summary || "요약이 없습니다.",
      date: output.date || "날짜 정보가 없습니다.",
      charging_pattern_scores: output.charging_pattern_scores || [
        {
          "home_centric_score": 0,
          "road_centric_score": 0
        }
      ],
      value_orientation_scores: output.value_orientation_scores || [
        {
          "cost_driven_score": 0,
          "tech_brand_driven_score": 0
        }
      ]
    };
    
    // JSON 응답으로 반환
    return new Response(JSON.stringify(analysisResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('⛔ 요청 처리 중 오류 발생', error);
    return new Response('서버 내부 오류가 발생했습니다.', { status: 500 });
  }
} 