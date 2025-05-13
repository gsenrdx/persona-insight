import { NextRequest } from 'next/server'
import { createDataStreamResponse } from 'ai'
// Edge Runtime – crypto.randomUUID() 지원
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

/* ---------- 메인 POST 핸들러 ---------- */
export async function POST(req: NextRequest) {
  const { messages, personaData } = await req.json()

  /* 1. 입력 검증 */
  if (!personaData) {
    return new Response('페르소나 데이터가 제공되지 않았습니다.', { status: 400 })
  }
  const lastUser = messages?.[messages.length - 1]?.content ?? ''

  /* 2. 업스트림 요청 — 외부 LLM/에이전트 API */
  const upstream = await fetch(
    'https://api.holdings.miso.gs/ext/v1/chat',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer app-2U7Nbl7pPsi3IEgET0HfomvT`,   // .env 에 보관
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: lastUser,
        inputs: {},
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
    console.error('⛔ Upstream error', upstream.status, err)
    return new Response('외부 API 오류', { status: 500 })
  }

  /* 3. Vercel AI Data-Stream 응답 생성 */
  return createDataStreamResponse({
    async execute(stream) {

      const messageId = crypto.randomUUID()
      stream.write(`f:${JSON.stringify({ messageId })}
`)

      /* (2) 업스트림 SSE → Data-Stream 변환 */
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

          try {
            const payload = JSON.parse(line) as UpstreamLine
            console.log('Debug: Upstream payload.answer:', payload.answer); 
            if (payload.event === 'agent_message' && typeof payload.answer === 'string') {
              const delta = payload.answer;
              if (delta) { // 빈 문자열이 아닌 경우에만 전송
                stream.write(`0:${JSON.stringify(delta)}
`)   // text 파트
              }
            }
          } catch (err) {
            console.error('⚠️ JSON parse error', err, line)
          }
        }
      }

      /* (3) finish_message 파트 전송 후 스트림 종료 (Vercel AI SDK Data-Stream Protocol) */
      stream.write(`d:${JSON.stringify({ finishReason: 'stop' })}
`)
    },

    /* 4. 스트림-레벨 오류 메시지 생성 */
    onError(error) {
      console.error('⛔ Data-stream error', error)
      return '서버 내부 오류가 발생했습니다.'
    }
  })
}
