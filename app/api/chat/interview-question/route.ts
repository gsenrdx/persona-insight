import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const MISO_INTERVIEW_AGENT_API_KEY = process.env.MISO_INTERVIEW_AGENT_API_KEY;

  if (!MISO_INTERVIEW_AGENT_API_KEY) {
    return new Response('MISO_INTERVIEW_AGENT_API_KEY is not configured.', { status: 500 });
  }

  const { question, selectedText, context, interviewId, fullScript } = await req.json()

  if (!question) {
    return new Response('질문이 제공되지 않았습니다.', { status: 400 })
  }


  // 전체 스크립트를 텍스트로 변환
  let fullContext = ''
  if (fullScript && Array.isArray(fullScript)) {
    fullContext = fullScript
      .map(item => `${item.speaker === 'question' ? 'Q' : 'A'}: ${item.cleaned_sentence}`)
      .join('\n')
  }

  // MISO API 호출
  const upstream = await fetch(
    'https://api.holdings.miso.gs/ext/v1/chat',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MISO_INTERVIEW_AGENT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: question,
        inputs: {
          selected_context: selectedText || '',
          full_context: fullContext
        },
        mode: 'streaming',
        user: 'persona-insight-interview-analyzer',
        files: []
      })
    }
  )

  if (!upstream.ok) {
    const errorText = await upstream.text()
    return new Response(errorText || 'MISO API 호출 중 오류가 발생했습니다.', { status: upstream.status })
  }
  
  if (!upstream.body) {
    return new Response('응답 본문이 없습니다.', { status: 500 })
  }

  // MISO API 스트림 필터링 처리
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
      
      await writer.close()
    } catch (error) {
      await writer.abort(error)
    }
  })()

  // 필터링된 스트림 반환
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}