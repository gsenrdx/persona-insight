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
  /** 대화 식별자 */
  conversation_id?: string
  /** 메시지 식별자 */
  message_id?: string
  /** 기타 필드들 무시 */
  [key: string]: unknown
}

/* ---------- 메인 POST 핸들러 ---------- */
export async function POST(req: NextRequest) {
  const { messages, personaData, conversationId: clientConversationId } = await req.json()

  /* 1. 입력 검증 */
  if (!personaData) {
    return new Response('페르소나 데이터가 제공되지 않았습니다.', { status: 400 })
  }
  const lastUser = messages?.[messages.length - 1]?.content ?? ''

  // 전달되는 값 콘솔 출력 (디버깅용)
  console.log('[MISO API 요청] query:', lastUser)
  console.log('[MISO API 요청] inputs:', personaData)
  console.log('[MISO API 요청] conversationId:', clientConversationId)

  const cleanInputs = { ...personaData }
  delete cleanInputs.keywords

  /* 2. 업스트림 요청 — 외부 LLM/에이전트 API */
  const upstream = await fetch(
    'https://api.holdings.miso.gs/ext/v1/chat',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer app-2U7Nbl7pPsi3IEgET0HfomvT`,   // 테스트용
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: lastUser,
        inputs: {
          selected_mode: "persona_chat",
          name: personaData.name,
          summary: personaData.summary,
          insight: personaData.insight,
          painPoint: personaData.painPoint,
          hiddenNeeds: personaData.hiddenNeeds,
          persona_character: personaData.persona_character
        },
        mode: 'streaming',
        conversation_id: clientConversationId || '',
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
      let misoConversationId: string | null = null;

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
            if (payload.event === 'agent_message' && typeof payload.answer === 'string') {
              const delta = payload.answer;
              if (delta) { // 빈 문자열이 아닌 경우에만 전송
                stream.write(`0:${JSON.stringify(delta)}
`)   // text 파트
              }
            }
            
            // MISO의 conversation_id 처리 - Vercel AI SDK 데이터 형식 사용 (배열로 감싸야 함)
            if (payload.conversation_id && !misoConversationId && !clientConversationId) {
              misoConversationId = payload.conversation_id;
              // 표준 데이터 스트림 형식 '2:' 사용 (data) - 배열 형태로 전송
              stream.write(`2:${JSON.stringify([{ misoConversationId: misoConversationId }])}
`);
              console.log('[MISO API 응답] New MISO Conversation ID:', misoConversationId);
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
