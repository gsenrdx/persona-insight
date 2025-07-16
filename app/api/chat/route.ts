import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PersonaData } from '@/types/persona'

export const runtime = 'nodejs'
export const maxDuration = 30

// 인터뷰 데이터 조회 및 요약 함수
async function getPersonaInterviewData(personaId: string, companyId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: { fetch: fetch },
    realtime: { disabled: true }
  })

  try {
    
    const { data: interviews, error: interviewError } = await supabase
      .from('interviews')
      .select(`
        id,
        primary_pain_points,
        primary_needs,
        key_takeaways,
        summary,
        interviewee_profile,
        cleaned_script
      `)
      .eq('persona_combination_id', personaId)
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .limit(15)


    if (!interviews || interviews.length === 0) {
      return null
    }


    // 1. 고민점 추출 및 요약
    const painPoints = interviews
      .flatMap(i => i.primary_pain_points || [])
      .map(p => `"${p.description}"`)
      .filter(Boolean)
      .slice(0, 8)
      .join(', ')


    // 2. 니즈 추출 및 요약  
    const needs = interviews
      .flatMap(i => i.primary_needs || [])
      .map(n => `"${n.description}"`)
      .filter(Boolean)
      .slice(0, 8)
      .join(', ')


    // 3. 핵심 인사이트 요약 (summary가 null이므로 key_takeaways 사용)
    const insights = interviews
      .flatMap(i => i.key_takeaways || [])
      .filter(Boolean)
      .join(', ')
      .substring(0, 800)


    // 4. 인상적인 발언 추출 (제거됨)
    // 5. 프로필 컨텍스트 생성 (제거됨)
    
    const result = {
      insights: insights.trim(),
      painPoints: painPoints.substring(0, 400),
      needs: needs.substring(0, 400),
      keyQuotes: '', // 제거됨
      profileContext: '' // 제거됨
    }


    return result

  } catch (error) {
    return null
  }
}

export async function POST(req: NextRequest) {
  const MISO_AGENT_API_KEY = process.env.MISO_AGENT_API_KEY

  if (!MISO_AGENT_API_KEY) {
    return new Response('MISO_AGENT_API_KEY is not configured.', { status: 500 })
  }

  try {
    const { messages, personaId, conversationId: clientConversationId } = await req.json()


    if (!personaId) {
      return new Response('페르소나 ID가 필요합니다.', { status: 400 })
    }

    const lastUser = messages?.[messages.length - 1]?.content ?? ''

    // Supabase 클라이언트 초기화
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { fetch: fetch },
      realtime: { disabled: true }
    })

    // 1. 페르소나 기본 정보 조회
    const { data: persona, error: personaError } = await supabase
      .from('persona_combinations')
      .select('id, title, description, persona_code, company_id')
      .eq('id', personaId)
      .single()

    if (personaError || !persona) {
      return new Response('페르소나를 찾을 수 없습니다.', { status: 404 })
    }


    // 2. 인터뷰 데이터 조회
    const interviewData = await getPersonaInterviewData(personaId, persona.company_id)


    // 3. MISO API 호출용 데이터 구성
    const chatInputs = {
      persona_title: persona.title || '',
      persona_description: persona.description || '',
      interview_insights: interviewData?.insights || '이 페르소나의 구체적인 인사이트는 지속적으로 업데이트됩니다.',
      pain_points: interviewData?.painPoints || '이 페르소나의 고민점은 인터뷰를 통해 파악됩니다.',
      needs: interviewData?.needs || '이 페르소나의 니즈는 인터뷰를 통해 파악됩니다.'
    }


    // 4. MISO API 호출
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
          inputs: chatInputs,
          mode: 'streaming',
          conversation_id: clientConversationId || '',
          user: 'persona-insight-user',
          files: []
        })
      }
    )

    if (!upstream.ok || !upstream.body) {
      const err = await upstream.text().catch(() => '')
      return new Response(`MISO API 오류: ${upstream.status} ${err}`, { status: 500 })
    }

    // 5. MISO API 가이드에 따른 직접 스트림 전달
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
        // 스트림 처리 오류 발생
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

  } catch (error) {
    return new Response('채팅 처리 중 오류가 발생했습니다.', { status: 500 })
  }
}