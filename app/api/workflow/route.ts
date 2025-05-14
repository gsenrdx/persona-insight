import { NextRequest } from 'next/server'
import { createDataStreamResponse } from 'ai'

export const runtime = 'edge'
export const maxDuration = 30

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

  // 1단계: 파일을 Miso API에 직접 업로드하고 URL 받기
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);
  uploadFormData.append('user', 'persona-insight-user');
  
  try {
    const uploadResponse = await fetch('https://api.holdings.miso.gs/ext/v1/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer app-2U7Nbl7pPsi3IEgET0HfomvT`,
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
    
    // 2단계: 파일 ID를 이용해 persona_extract API 호출
    const upstream = await fetch(
      'https://api.holdings.miso.gs/ext/v1/chat',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer app-2U7Nbl7pPsi3IEgET0HfomvT`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `인터뷰 분석: ${file.name}`,
          inputs: {
            selected_mode: "persona_extract"
          },
          mode: 'streaming',
          conversation_id: '',
          user: 'persona-insight-user',
          files: [{
            type: 'image', // API 문서에서는 현재 이미지만 지원한다고 하지만, 실제로는 다른 파일도 지원할 수 있음
            transfer_method: 'local_file',
            upload_file_id: fileId
          }]
        })
      }
    );
    
    /* 오류 처리 */
    if (!upstream.ok || !upstream.body) {
      const err = await upstream.text().catch(() => '')
      console.error('⛔ Workflow API 오류', upstream.status, err)
      return new Response('외부 API 오류', { status: 500 })
    }

    /* Vercel AI Data-Stream 응답 생성 */
    return createDataStreamResponse({
      async execute(stream) {
        const messageId = crypto.randomUUID()
        stream.write(`f:${JSON.stringify({ messageId })}
`)

        /* 업스트림 SSE → Data-Stream 변환 */
        const reader = upstream.body!.getReader()
        const td = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += td.decode(value, { stream: true })

          /* 업스트림은 \n 단위 SSE 라인 — 하나씩 파싱 */
          let idx: number
          while ((idx = buf.indexOf('\n')) !== -1) {
            const raw = buf.slice(0, idx).trim()
            buf = buf.slice(idx + 1)

            if (!raw) continue
            const line = raw.startsWith('data: ') ? raw.slice(6) : raw

            // 특수 이벤트 메시지(ping 등) 건너뛰기
            if (line.startsWith('event:')) {
              console.log('이벤트 메시지 수신:', line);
              continue;
            }

            try {
              const payload = JSON.parse(line) as UpstreamLine
              if (payload.event === 'agent_message' && typeof payload.answer === 'string') {
                const delta = payload.answer;
                if (delta) { // 빈 문자열이 아닌 경우에만 전송
                  stream.write(`0:${JSON.stringify(delta)}
`)   // text 파트
                }
              }
            } catch (err) {
              // JSON 파싱 실패 시 특수 메시지 처리
              console.error('⚠️ JSON 파싱 오류', err, line)
              
              // ping 이벤트와 같은 특수 메시지 확인
              if (line.includes('event: ping') || line === 'event: ping') {
                console.log('Ping 이벤트 감지됨');
                continue;
              }
            }
          }
        }

        /* finish_message 파트 전송 후 스트림 종료 */
        stream.write(`d:${JSON.stringify({ finishReason: 'stop' })}
`)
      },

      onError(error) {
        console.error('⛔ Data-stream 오류', error)
        return '서버 내부 오류가 발생했습니다.'
      }
    })
  } catch (error) {
    console.error('⛔ 요청 처리 중 오류 발생', error);
    return new Response('서버 내부 오류가 발생했습니다.', { status: 500 });
  }
} 