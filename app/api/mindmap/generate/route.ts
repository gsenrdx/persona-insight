import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { conversationContent, personaName, conversationId } = await req.json();
    
    if (!conversationContent) {
      return new Response('대화 내용이 제공되지 않았습니다.', { status: 400 });
    }

    console.log('[마인드맵 생성] 요청 시작 - 페르소나:', personaName);
    console.log('[마인드맵 생성] 대화 길이:', conversationContent.length);

    // 환경변수에서 API 정보 가져오기
    const MISO_API_URL = process.env.MISO_API_URL || 'https://api.holdings.miso.gs';
    const MISO_API_KEY = process.env.MISO_API_KEY;

    if (!MISO_API_KEY) {
      console.error('⛔ MISO_API_KEY 환경변수가 설정되지 않았습니다');
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
        console.error('사용자 인증 실패:', userError);
        return new Response('인증에 실패했습니다.', { status: 401 });
      }

      userId = user.id;

      // 사용자 프로필에서 이름 조회
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('사용자 프로필 조회 실패:', profileError);
        return new Response('사용자 정보를 찾을 수 없습니다.', { status: 400 });
      }

      userName = profile.name;
      console.log('[마인드맵 생성] 인증 성공 - 사용자:', userName);
    } catch (error) {
      console.error('인증 처리 중 오류:', error);
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

    console.log('[마인드맵 생성] API 요청 데이터:', JSON.stringify(workflowRequestBody, null, 2));

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
      console.error('⛔ 마인드맵 생성 API 오류:');
      console.error('- 상태 코드:', workflowResponse.status);
      console.error('- 상태 텍스트:', workflowResponse.statusText);
      console.error('- 응답 본문:', err);
      
      return new Response(JSON.stringify({
        error: '마인드맵 생성 API 오류',
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
    console.log('[마인드맵 생성] API 응답:', workflowResult);
    
    // 실제 API에서 반환될 응답 구조에 따라 파싱
    const output = workflowResult.data?.outputs || workflowResult.outputs || {};
    
    // 마인드맵 결과 구성
    let mindmapData: any = null;
    
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
              mindmapData = JSON.parse(cleanedResult);
              console.log('[마인드맵 생성] JSON 파싱 성공');
              
              // 필수 필드 검증 (계층적 구조에 맞게)
              const requiredFields = ['title', 'root_node', 'main_topics'];
              const missingFields = requiredFields.filter(field => !mindmapData[field]);
              
              if (missingFields.length > 0) {
                console.warn('[마인드맵 생성] 필수 필드 누락:', missingFields);
                mindmapData.warning = `필수 필드 누락: ${missingFields.join(', ')}`;
              }
              
              // 토픽 개수 및 구조 검증
              if (mindmapData.main_topics && Array.isArray(mindmapData.main_topics)) {
                console.log('[마인드맵 생성] 토픽 개수:', mindmapData.main_topics.length);
                
                mindmapData.main_topics.forEach((topic: any, index: number) => {
                  if (topic.subtopics && Array.isArray(topic.subtopics)) {
                    const totalContentItems = topic.subtopics.reduce((acc: number, subtopic: any) => {
                      return acc + (subtopic.content_items ? subtopic.content_items.length : 0);
                    }, 0);
                    console.log(`[마인드맵 생성] 토픽 ${index + 1} "${topic.title}": ${topic.subtopics.length}개 세부주제, ${totalContentItems}개 내용`);
                  }
                });
              }
              
            } else {
              console.error('[마인드맵 생성] 올바른 JSON 형태가 아님');
              console.error('시작 문자:', cleanedResult.charAt(0));
              console.error('끝 문자:', cleanedResult.charAt(cleanedResult.length - 1));
              mindmapData = { error: 'JSON 형태가 올바르지 않음', raw: cleanedResult };
            }
            
          } catch (parseError) {
            console.error('[마인드맵 생성] JSON 파싱 실패:', parseError);
            console.error('[마인드맵 생성] 원본 데이터 길이:', output.result.length);
            console.error('[마인드맵 생성] 원본 데이터 시작 100자:', output.result.substring(0, 100));
            console.error('[마인드맵 생성] 원본 데이터 끝 100자:', output.result.substring(Math.max(0, output.result.length - 100)));
            
            // 파싱 실패 시에도 raw 데이터를 포함해서 클라이언트에서 재시도할 수 있게 함
            mindmapData = { 
              error: 'JSON 파싱 실패', 
              raw: output.result,
              parseError: parseError instanceof Error ? parseError.message : String(parseError)
            };
          }
        } else {
          // 이미 객체인 경우 그대로 사용
          mindmapData = output.result;
          console.log('[마인드맵 생성] 객체 형태 데이터 사용');
        }
      } else {
        console.warn('[마인드맵 생성] result 필드가 없음');
        console.log('[마인드맵 생성] 사용 가능한 필드들:', Object.keys(output));
        mindmapData = { error: 'result 필드 없음', available_fields: Object.keys(output), output };
      }
    } catch (error) {
      console.error('[마인드맵 생성] 결과 처리 오류:', error);
      mindmapData = { error: '결과 처리 오류', message: error instanceof Error ? error.message : String(error) };
    }

    // 마인드맵 데이터를 데이터베이스에 저장 (선택사항)
    try {
      if (userId && conversationId && mindmapData && !mindmapData.error) {
        const { error: insertError } = await supabase
          .from('mindmaps')
          .insert([{
            conversation_id: conversationId,
            persona_name: personaName,
            mindmap_data: mindmapData,
            created_by: userId,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.error('[마인드맵 저장] 데이터베이스 오류:', insertError);
        } else {
          console.log('[마인드맵 저장] 성공');
        }
      }
    } catch (saveError) {
      console.error('[마인드맵 저장] 예외 발생:', saveError);
    }
    
    // 마인드맵 데이터 반환
    return new Response(JSON.stringify({
      success: true,
      mindmapData,
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
    console.error('⛔ 마인드맵 생성 중 오류 발생:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '마인드맵 생성 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 