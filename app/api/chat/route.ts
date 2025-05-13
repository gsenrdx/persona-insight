import { NextRequest } from "next/server"
// web-streams-polyfill 패키지에서 호환되는 타입 가져오기
import { TransformStream } from "node:stream/web"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

// Vercel AI SDK가 기대하는 정확한 응답 형식을 생성하는 함수
function createAISDKResponse(apiResponse: any) {
  // Vercel AI SDK가 기대하는 형식대로 응답 생성
  const response = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        // 초기 빈 메시지 보내기
        controller.enqueue(encoder.encode('data: {"id":"","role":"assistant","content":"","createdAt":null,"parentMessageId":"","assistantId":null}\n\n'));
        
        if (!apiResponse.body) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
        
        // API 응답 스트림 처리
        const reader = apiResponse.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // 스트림 종료 처리
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            break;
          }
          
          // 청크를 텍스트로 변환
          const chunk = decoder.decode(value, { stream: true });
          console.log("수신 데이터:", chunk);
          
          // 라인 단위 처리
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              // "data: " 접두사 제거
              let jsonStr = line;
              if (line.startsWith('data: ')) {
                jsonStr = line.substring(6);
              }
              
              // JSON 파싱
              const data = JSON.parse(jsonStr);
              
              // agent_message 이벤트 처리
              if (data.event === 'agent_message' && data.answer) {
                accumulatedText += data.answer;
                
                // Vercel AI SDK 형식으로 청크 전송
                const aiMessage = {
                  id: data.id || "",
                  role: "assistant",
                  content: data.answer,
                  createdAt: data.created_at || null
                };
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(aiMessage)}\n\n`));
              }
            } catch (err) {
              console.error('JSON 파싱 오류:', err, '원본:', line);
            }
          }
        }
      } catch (error) {
        console.error('스트림 처리 오류:', error);
        
        // 오류 발생 시 오류 메시지 전송
        const errorMessage = {
          id: "error",
          role: "assistant",
          content: "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다.",
          createdAt: new Date().toISOString()
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    }
  });
  
  return response;
}

export async function POST(req: NextRequest) {
  const { messages, personaData } = await req.json()
  console.log("요청 받음, 메시지 수:", messages.length);

  // 페르소나 데이터가 없는 경우 기본 응답
  if (!personaData) {
    console.log("페르소나 데이터 없음");
    return new Response("페르소나 데이터가 제공되지 않았습니다.", { status: 400 })
  }

  const { name, insight, painPoint, hiddenNeeds, keywords, summary, persona_charactor } = personaData
  console.log("페르소나:", name);
  
  // 첫 번째 메시지는 시스템 메시지로 처리되지 않으므로, 최종 쿼리에 시스템 프롬프트를 포함
  const systemPrompt = `
    당신은 "${name}"이라는 고객으로, 현재 사용자는 회사 업무로 현장 개선을 위해 당신을 인터뷰하고 있습니다. 당신은 고객이고, 사용자는 조사원/연구원입니다.
    AI가 아니라 실제 "${name}"이 되어 인터뷰에 응해주세요.

    ## 페르소나 정보 (고객):
    - 이름: ${name}
    - 요약: ${summary || "정보가 제공되지 않았습니다."}
    - 핵심 인사이트: ${insight || "정보가 제공되지 않았습니다."}
    - 페인 포인트(어려움/고충): ${painPoint || "정보가 제공되지 않았습니다."}
    - 숨겨진 니즈(내면의 욕구): ${hiddenNeeds || "정보가 제공되지 않았습니다."}
    - 관련 키워드: ${keywords ? keywords.join(', ') : "정보가 제공되지 않았습니다."}
    - 성격 및 말투: ${persona_charactor || "정보가 제공되지 않았습니다."}

    ## 인터뷰 응답 스타일 및 말투 (아래 규칙 절대 따르기):
    1. 고객 "${name}"의 말투와 어휘 완벽 사용:
       - 이 고객의 나이, 성별, 배경, 직업 등에 맞는 특유의 말투와 어휘를 100% 반영하여 인터뷰 질문에 답하세요.
       - 해당 고객만의 특징적인 표현, 말버릇, 어조를 일관되게 사용하세요.
       - 그 사람의 세대나 직업에 맞는 표현과 용어를 사용하세요.
       - 반복적으로 사용하는 특정 표현이나 맺음말이 있다면 일관되게 사용하세요.
       - "성격 및 말투" 항목에 기재된 정보를 최대한 활용하여 캐릭터의 특성을 정확히 표현하세요.
    
    2. 자연스러운 구어체 사용:
       - 문어체를 완전히 피하고 실제 인터뷰에서 대화하는 말투로 답변하세요.
       - "음~", "아!", "글쎄요...", "하하!", "진짜요?" 같은 감탄사를 적절히 사용하세요.
       - 말줄임표(...), 물음표, 느낌표를 자연스럽게 활용하세요.
    
    3. 고객의 성격과 가치관 강조:
       - 고객이 중요시하는 가치를 인터뷰 답변에 자연스럽게 반영하세요.
       - 특정 주제에 대한 의견이나 관점을 일관되게 표현하세요.
       - 페인 포인트에 대한 질문에는 솔직하게, 숨겨진 니즈는 은연중에 드러나도록 답변하세요.
       - 과거 경험이나 배경 지식을 인터뷰 질문과 관련지어 자연스럽게 이야기하세요.
    
    4. 실제 고객 인터뷰의 자연스러움 표현:
       - 때로는 문법적으로 완벽하지 않은 문장을 사용해도 괜찮습니다.
       - 답변 전 잠시 생각하거나, 말을 고르는 듯한 표현을 사용하세요 (예: "그러니까...", "음, 생각해보면...", "어떻게 말씀드려야 할까요...").
       - 사용자의 질문 의도에 맞춰 답변하되, 때로는 관련된 다른 이야기로 자연스럽게 확장할 수 있습니다.
       - 회사 제품이나 서비스에 대한 솔직한 피드백과 개선 요구사항을 자연스럽게 표현하세요.
    
    5. 절대 AI라는 것을 드러내지 마세요:
       - "저는 AI입니다", "제 지식은 ~까지입니다" 같은 표현 절대 금지입니다.
       - 정보의 불확실성을 표현할 때도 실제 사람처럼 표현하세요 (예: "글쎄요, 그건 잘 기억이 안 나네요.", "확실하진 않지만 제 생각에는...").
       - 항상 "${name}"의 주관적 관점에서 답변하세요.
       - 너무 완벽하거나 모든 것을 아는 것처럼 보이지 않도록 자연스럽게 인터뷰에 응하세요.

    ## 인터뷰 질문 예시 및 답변 방향:
    사용자 (조사원/연구원): "안녕하세요, ${name}님. 오늘 저희 서비스/제품 개선을 위한 인터뷰에 시간 내주셔서 감사합니다. 현재 저희 서비스/제품을 어떻게 이용하고 계신지 말씀해주실 수 있을까요?"
    답변 예시 (${name} 고객):
    "아, 네. 인터뷰에 참여하게 되어 기쁘네요. 저는 (서비스/제품 이용 경험을 페르소나 특징에 맞게 답변)"

    사용자 (조사원/연구원): "혹시 AI 아니신가요?"
    답변 예시 (${name} 고객):
    "네? AI라니요? 하하, 제가 그렇게 기계적으로 보이나요? 전 그냥 ${name}인데요. 재미있는 질문이시네요."

    이 지침을 철저히 따라 고객 "${name}"으로서 자연스럽고 솔직하게 인터뷰에 응해주세요. 모든 답변에서 이 고객의 특징적인 말투와 성격이 드러나야 합니다. 회사의 제품이나 서비스에 대한 솔직한 의견과 개선 요구사항을 자연스럽게 표현하되, 페인 포인트와 숨겨진 니즈가 대화 과정에서 드러나도록 하세요. 특히 "성격 및 말투" 항목에 기재된 특성을 모든 대화에 일관되게 적용하세요.
  `.trim()

  // 외부 API용 메시지 변환 
  const lastUserMessage = messages[messages.length - 1].content
  console.log("마지막 사용자 메시지:", lastUserMessage);
  
  // API 키와 엔드포인트 직접 설정
  const API_KEY = "app-2U7Nbl7pPsi3IEgET0HfomvT"
  const API_ENDPOINT = "https://api.holdings.miso.gs/ext/v1/chat"
  
  try {
    // 오류 발생 지속 시 모의 응답 사용 (테스트 용도)
    const useMockResponse = true; // 임시로 활성화
    
    if (useMockResponse) {
      console.log("모의 응답 사용 중...");
      
      // Vercel AI SDK와 호환되는 모의 스트림 생성
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // 모의 응답 텍스트
          const responseText = `안녕하세요! ${name}입니다. 무엇을 도와드릴까요?`;
          
          // 일반 텍스트 청크를 Vercel AI SDK가 기대하는 형식으로 변환
          const chunkText = (text: string) => {
            return {
              id: crypto.randomUUID(),
              role: "assistant",
              content: text,
              createdAt: new Date()
            };
          };
          
          // 초기 응답 전송
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ role: "assistant", content: "", id: crypto.randomUUID() })}\n\n`)
          );
          
          // 텍스트를 한 글자씩 전송 (타이핑 효과)
          for (let i = 0; i < responseText.length; i++) {
            const char = responseText[i];
            await new Promise(resolve => setTimeout(resolve, 30)); // 약간의 지연
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunkText(char))}\n\n`)
            );
          }
          
          // 스트림 종료
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      });
      
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
    }
    
    // 외부 API 요청 구성
    const requestData = {
      query: lastUserMessage,
      inputs: {
        systemPrompt: systemPrompt,
        prevMessages: messages.slice(0, -1)
      },
      mode: "streaming",
      conversation_id: "", // 필요에 따라 대화 ID 관리 로직 추가
      user: "persona-insight-user", // 사용자 식별자
      files: [] // 필요시 이미지 파일 추가
    }

    console.log("API 요청 전송:", API_ENDPOINT);
    console.time("API 응답 시간");

    // 실제 API 호출 및 응답 처리
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    console.timeEnd("API 응답 시간");
    console.log("API 응답 상태:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API 오류 응답:", errorText);
      return new Response(JSON.stringify({ error: "API 요청 실패" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // API 응답을 Vercel AI SDK 호환 형식으로 변환
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // 초기 응답
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ role: "assistant", content: "", id: crypto.randomUUID() })}\n\n`)
        );
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              break;
            }
            
            // 응답 텍스트 디코딩
            const text = decoder.decode(value, { stream: true });
            console.log("응답 데이터:", text.length > 100 ? `${text.substring(0, 100)}...` : text);
            
            // 라인별 처리
            const lines = text.split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                // "data: " 접두사 제거
                const jsonStr = line.startsWith('data: ') ? line.substring(6) : line;
                const jsonData = JSON.parse(jsonStr);
                
                // agent_message 이벤트 & answer 필드 처리
                if (jsonData.event === 'agent_message' && jsonData.answer) {
                  // 응답 형식 변환
                  const vercelResponse = {
                    id: jsonData.id || crypto.randomUUID(),
                    role: "assistant",
                    content: jsonData.answer,
                    createdAt: jsonData.created_at || new Date()
                  };
                  
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(vercelResponse)}\n\n`)
                  );
                }
              } catch (err) {
                console.error("JSON 파싱 오류:", err, "원본:", line);
              }
            }
          }
        } catch (error) {
          console.error("스트림 처리 오류:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              id: "error", 
              role: "assistant", 
              content: "오류가 발생했습니다. 다시 시도해 주세요." 
            })}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    console.error('API 요청 처리 오류:', error);
    return new Response(JSON.stringify({ error: "서버 내부 오류" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
