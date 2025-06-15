import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const MISO_AGENT_API_KEY = process.env.MISO_AGENT_API_KEY;

  if (!MISO_AGENT_API_KEY) {
    return new Response('MISO_AGENT_API_KEY is not configured.', { status: 500 });
  }
  const { messages, personaData, conversationId: clientConversationId } = await req.json()

  if (!personaData) {
    return new Response('페르소나 데이터가 제공되지 않았습니다.', { status: 400 })
  }

  const lastUser = messages?.[messages.length - 1]?.content ?? ''

  // 요청 데이터 로깅
  console.log('Chat API Request:', {
    lastUser,
    personaData: {
      persona_title: personaData.persona_title || personaData.name || '',
      persona_summary: personaData.persona_summary || personaData.summary || '',
      persona_style: personaData.persona_style || personaData.persona_character || '',
      painpoints: personaData.painpoints || personaData.painPoint || '',
      needs: personaData.needs || personaData.hiddenNeeds || '',
      insight: personaData.insight || '',
      insight_quote: personaData.insight_quote || ''
    }
  })

  // MISO API 호출
  const upstream = await fetch(
    'https://api.holdings.miso.gs/ext/v1/chat',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MISO_AGENT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: lastUser,
        inputs: {
          persona_title: personaData.persona_title || personaData.name || '',
          persona_summary: personaData.persona_summary || personaData.summary || '',
          persona_style: personaData.persona_style || personaData.persona_character || '',
          painpoints: personaData.painpoints || personaData.painPoint || '',
          needs: personaData.needs || personaData.hiddenNeeds || '',
          insight: personaData.insight || '',
          insight_quote: personaData.insight_quote || ''
        },
        mode: 'streaming',
        conversation_id: clientConversationId || '',
        user: 'persona-insight-user',
        files: []
      })
    }
  )

  if (!upstream.ok || !upstream.body) {
    const err = await upstream.text().catch(() => '')
    console.error('MISO API Error:', {
      status: upstream.status,
      statusText: upstream.statusText,
      error: err
    })
    return new Response(`외부 API 오류: ${upstream.status} ${err}`, { status: 500 })
  }

  // MISO API 가이드에 따른 직접 스트림 전달
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  // 백그라운드에서 MISO API 스트림 처리
  ;(async () => {
    try {
      const reader = upstream.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        // MISO API 청크 디코딩
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // 줄 단위로 파싱하여 message_replace 이벤트 필터링
        let lineEnd
        while ((lineEnd = buffer.indexOf('\n')) !== -1) {
          const rawLine = buffer.slice(0, lineEnd + 1) // 개행 문자 포함
          buffer = buffer.slice(lineEnd + 1)
          
          if (!rawLine.trim()) {
            // 빈 줄은 그대로 전달 (SSE 메시지 구분자)
            await writer.write(encoder.encode(rawLine))
            continue
          }
          
          // data: 접두사가 있는 줄만 확인
          if (rawLine.startsWith('data: ')) {
            const dataContent = rawLine.slice(6).trim()
            
            if (dataContent === '[DONE]') {
              // DONE 메시지는 그대로 전달
              await writer.write(encoder.encode(rawLine))
              continue
            }
            
            try {
              const payload = JSON.parse(dataContent)
              
              // message_replace 이벤트는 필터링하여 전달하지 않음
              if (payload.event === 'message_replace') {
                continue // 이 이벤트는 클라이언트로 전달하지 않음
              }
              
              // 다른 이벤트는 그대로 전달
              await writer.write(encoder.encode(rawLine))
              
            } catch (parseError) {
              // JSON 파싱 실패 시 원본 그대로 전달
              await writer.write(encoder.encode(rawLine))
            }
          } else {
            // data: 가 아닌 줄은 그대로 전달 (event:, id: 등)
            await writer.write(encoder.encode(rawLine))
          }
        }
      }
      
      // 남은 버퍼 내용 처리
      if (buffer) {
        await writer.write(encoder.encode(buffer))
      }
      
    } catch (error) {
    } finally {
      await writer.close()
    }
  })()

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}