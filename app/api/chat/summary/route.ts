import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { conversationContent, personaName, conversationId } = await req.json();
    
    if (!conversationContent) {
      return new Response('대화 내용이 제공되지 않았습니다.', { status: 400 });
    }

    // 환경변수에서 API 정보 가져오기
    const MISO_API_URL = process.env.MISO_API_URL || 'https://api.holdings.miso.gs';
    const MISO_API_KEY = process.env.MISO_API_KEY;

    if (!MISO_API_KEY) {
      return new Response('API 키가 설정되지 않았습니다.', { status: 500 });
    }

    // Authorization 헤더에서 사용자 정보 추출
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return new Response('인증 정보가 필요합니다.', { status: 401 });
    }

    // Supabase 클라이언트 초기화
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // JWT 토큰에서 사용자 정보 추출
    let userId: string | null = null;
    let userName: string | null = null;

    try {
      const token = authorization.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response('인증에 실패했습니다.', { status: 401 });
      }

      userId = user.id;
      
      // 먼저 user metadata에서 이름 확인 (캐시된 데이터)
      userName = user.user_metadata?.name || user.user_metadata?.full_name;
      
      // metadata에 없으면 DB 조회
      if (!userName) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single();

        if (profileError || !profile) {
          return new Response('사용자 정보를 찾을 수 없습니다.', { status: 400 });
        }

        userName = profile.name;
      }
    } catch (error) {
      return new Response('인증 처리 중 오류가 발생했습니다.', { status: 401 });
    }

    // 워크플로우 API 호출
    const workflowRequestBody = {
      inputs: {
        context: conversationContent,
        preprocess_type: 'mindmap'
      },
      mode: 'blocking',
      user: userName || 'persona-insight-user'
    };


    const workflowResponse = await fetch(
      `${MISO_API_URL}/ext/v1/workflows/run`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MISO_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowRequestBody)
      }
    );
    
    if (!workflowResponse.ok) {
      const err = await workflowResponse.text().catch(() => '');
      
      return new Response(JSON.stringify({
        error: '요약 생성 API 오류',
        details: {
          status: workflowResponse.status,
          statusText: workflowResponse.statusText,
          message: err,
          timestamp: new Date().toISOString()
        }
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 응답 결과 파싱
    const workflowResult = await workflowResponse.json();
    
    // 실제 API에서 반환될 응답 구조에 따라 파싱
    const output = workflowResult.data?.outputs || workflowResult.outputs || {};
    
    // 요약 결과 구성
    let summaryData: { main_topics?: Array<{ subtopics: Array<{ messages: unknown[] }> }> } | null = null;
    
    try {
      // result 필드에서 JSON 데이터 추출
      if (output.result) {
        if (typeof output.result === 'string') {
          // 문자열인 경우 정리 후 JSON 파싱 시도
          try {
            let cleanedResult = output.result.trim();
            
            // 마크다운 코드 블록 제거
            cleanedResult = cleanedResult.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
            cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/i, '');
            
            // 앞뒤 불필요한 줄바꿈 및 공백 제거
            cleanedResult = cleanedResult.trim();
            
            // JSON 형태인지 확인 후 파싱
            if (cleanedResult.startsWith('{') && cleanedResult.endsWith('}')) {
              summaryData = JSON.parse(cleanedResult);
              
              // 필수 필드 검증 (계층적 구조에 맞게)
              const requiredFields = ['title', 'root_node', 'main_topics'];
              const missingFields = requiredFields.filter(field => !summaryData[field]);
              
              if (missingFields.length > 0) {
                summaryData.warning = `필수 필드 누락: ${missingFields.join(', ')}`;
              }
              
              // 토픽 개수 및 구조 검증
              if (summaryData.main_topics && Array.isArray(summaryData.main_topics)) {
                
                summaryData.main_topics.forEach((topic) => {
                  if (topic.subtopics && Array.isArray(topic.subtopics)) {
                    topic.subtopics.reduce((acc, subtopic) => {
                      return acc + (subtopic.content_items ? subtopic.content_items.length : 0);
                    }, 0);
                  }
                });
              }
              
            } else {
              summaryData = { error: 'JSON 형태가 올바르지 않음', raw: cleanedResult };
            }
            
          } catch (parseError) {
            
            // 파싱 실패 시에도 raw 데이터를 포함해서 클라이언트에서 재시도할 수 있게 함
            summaryData = { 
              error: 'JSON 파싱 실패', 
              raw: output.result,
              parseError: parseError instanceof Error ? parseError.message : String(parseError)
            };
          }
        } else {
          // 이미 객체인 경우 그대로 사용
          summaryData = output.result;
        }
      } else {
        summaryData = { error: 'result 필드 없음', available_fields: Object.keys(output), output };
      }
    } catch (error) {
      summaryData = { error: '결과 처리 오류', message: error instanceof Error ? error.message : String(error) };
    }

    // 요약 데이터를 데이터베이스에 저장 (선택사항)
    try {
      if (userId && conversationId && summaryData && !summaryData.error) {
        const { error: insertError } = await supabase
          .from('summaries')
          .insert([{
            conversation_id: conversationId,
            persona_name: personaName,
            summary_data: summaryData,
            created_by: userId,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
        } else {
        }
      }
    } catch (saveError) {
    }
    
    // 요약 데이터 반환
    return new Response(JSON.stringify({
      success: true,
      summaryData,
      metadata: {
        personaName,
        conversationId,
        generatedAt: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: '요약 생성 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 