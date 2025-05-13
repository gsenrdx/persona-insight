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

  // 파일에서 텍스트 추출 및 유효성 검사
  const interview_log = await file.text();
  
  // 텍스트가 비어있는지 확인
  if (!interview_log.trim()) {
    return new Response('파일에 텍스트가 없습니다.', { status: 400 });
  }
  
  const query = `인터뷰 분석: ${file.name}`;
  
  console.log('[MISO Workflow API 요청] 파일 크기:', file.size);
  console.log('[MISO Workflow API 요청] query:', query);
  console.log('[MISO Workflow API 요청] 텍스트 길이:', interview_log.length);
  
  // 텍스트 미리보기 로깅 (보안상 필요한 경우 제거)
  if (interview_log.length > 100) {
    console.log('[MISO Workflow API 요청] 텍스트 미리보기:', interview_log.substring(0, 100) + '...');
  } else {
    console.log('[MISO Workflow API 요청] 텍스트 미리보기:', interview_log);
  }

  /* 업스트림 요청 - 외부 LLM/에이전트 API */
  const upstream = await fetch(
    'https://api.holdings.miso.gs/ext/v1/chat',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer app-2U7Nbl7pPsi3IEgET0HfomvT`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        inputs: {
          selected_mode: "workflow",
          interview_log: interview_log
        },
        mode: 'streaming',
        conversation_id: '',
        user: 'persona-insight-user',
        files: []
      })
    }
  )

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
} 