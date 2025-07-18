import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncInterviewTopicsToPersona } from '@/lib/services/miso'
import { 
  PersonaSynthesisInputs, 
  PersonaSynthesisResponse,
  PersonaSynthesisOutputs,
  WorkflowRequest,
  WorkflowResponse,
  IntervieweeData
} from '@/types/workflow'
import { Persona } from '@/types/project'

export async function POST(req: NextRequest) {
  try {
    const { selectedInterviewee, personaType, projectId, personaId }: PersonaSynthesisInputs = await req.json();
    
    if (!selectedInterviewee || !personaType) {
      return NextResponse.json({ 
        error: 'selectedInterviewee와 personaType이 필요합니다.' 
      }, { status: 400 });
    }


    // Authorization 헤더에서 사용자 정보 추출
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: '인증 정보가 필요합니다.' }, { status: 401 });
    }

    // Supabase 클라이언트 초기화 (서버용 - realtime 완전 비활성화)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      },
      global: {
        fetch: fetch
      },
      realtime: {
        disabled: true
      }
    });

    // JWT 토큰에서 사용자 정보 추출
    let userId: string | null = null;
    let companyId: string | null = null;
    let userName: string | null = null;

    try {
      const token = authorization.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 401 });
      }

      userId = user.id;

      // 사용자 프로필에서 company_id와 사용자 이름 조회
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, name')
        .eq('id', userId)
        .single();

      if (profileError || !profile?.company_id) {
        return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 400 });
      }

      companyId = profile.company_id;
      userName = profile.name;
      
    } catch (error) {
      return NextResponse.json({ error: '인증 처리 중 오류가 발생했습니다.' }, { status: 401 });
    }

    // personas 테이블에서 해당 persona_id나 persona_type의 데이터 조회
    let personas, personasError;
    
    if (personaId) {
      // personaId가 있으면 해당 페르소나 직접 조회
      const { data, error } = await supabase
        .from('personas')
        .select(`
          id,
          persona_type,
          persona_description,
          persona_summary,
          persona_style,
          painpoints,
          needs,
          insight,
          insight_quote,
          thumbnail,
          project_id,
          combination_id
        `)
        .eq('id', personaId)
        .eq('company_id', companyId)
        .eq('active', true); // 활성화된 페르소나만 조회
      
      personas = data;
      personasError = error;
    } else {
      // 먼저 새로운 분류 체계에서 매핑 확인
      const { data: mapping } = await supabase
        .from('persona_type_mappings')
        .select('combination_id')
        .eq('company_id', companyId)
        .eq('legacy_persona_type', personaType)
        .single();
      
      if (mapping?.combination_id) {
        // 새로운 분류 체계의 combination_id로 조회
        const { data, error } = await supabase
          .from('personas')
          .select(`
            id,
            persona_type,
            persona_description,
            persona_summary,
            persona_style,
            painpoints,
            needs,
            insight,
            insight_quote,
            thumbnail,
            project_id,
            combination_id
          `)
          .eq('company_id', companyId)
          .eq('combination_id', mapping.combination_id)
          .eq('active', true);
        
        personas = data;
        personasError = error;
      } else {
        // 매핑이 없으면 기존 방식대로 persona_type으로 조회
        const { data, error } = await supabase
          .from('personas')
          .select(`
            id,
            persona_type,
            persona_description,
            persona_summary,
            persona_style,
            painpoints,
            needs,
            insight,
            insight_quote,
            thumbnail,
            project_id,
            combination_id
          `)
          .eq('company_id', companyId)
          .eq('persona_type', personaType)
          .eq('active', true);
        
        personas = data;
        personasError = error;
      }
    }

    if (personasError) {
      return NextResponse.json({ error: '페르소나 데이터를 조회하는데 실패했습니다.' }, { status: 500 });
    }

    // selectedInterviewee가 문자열이면 JSON 파싱 시도
    let parsedInterviewee = selectedInterviewee;
    if (typeof selectedInterviewee === 'string') {
      try {
        parsedInterviewee = JSON.parse(selectedInterviewee);
      } catch (e) {
        parsedInterviewee = { user_description: selectedInterviewee };
      }
    }

    let selectedPersona;
    let isNewPersona = false;
    let activeGenerateImage = "false";

    if (!personas || personas.length === 0) {
      // 기존 페르소나가 없으면 신규 생성을 위한 기본 구조 생성
      isNewPersona = true;
      activeGenerateImage = "true"; // 신규 페르소나는 이미지 생성
      
      // 신규 페르소나용 기본 데이터 (MISO API 호출 후 실제 생성)
      selectedPersona = {
        persona_type: personaType,
        persona_description: parsedInterviewee.description || parsedInterviewee.user_description || `${personaType} 타입 사용자`,
        persona_summary: '',
        persona_style: '',
        painpoints: '',
        needs: '',
        insight: '',
        insight_quote: ''
      };
    } else {
      selectedPersona = personas[0]; // 첫 번째 페르소나 사용
      
      // thumbnail이 비어있지 않고 데이터가 있으면 "false" (이미 이미지가 있음), 비어있으면 "true" (이미지 생성 필요)
      activeGenerateImage = (!selectedPersona?.thumbnail || selectedPersona.thumbnail === null || selectedPersona.thumbnail.trim() === '') ? "true" : "false";
      
    }

    if (!selectedPersona) {
      return NextResponse.json({
        error: '페르소나를 선택할 수 없습니다',
        success: false
      }, { status: 400 })
    }

    // MISO API 호출을 위한 데이터 준비
    const requestBody: WorkflowRequest = {
      inputs: {
        preprocess_type: 'persona',
        selected_interviewee: typeof selectedInterviewee === 'string' 
          ? selectedInterviewee 
          : JSON.stringify(selectedInterviewee),
        selected_persona: JSON.stringify(selectedPersona),
        active_generate_image: activeGenerateImage
      },
      mode: 'blocking',
      user: userName || 'persona-insight-user',
      files: []
    };

    // 환경변수에서 API 정보 가져오기
    const MISO_API_URL = process.env.MISO_API_URL || 'https://api.holdings.miso.gs';
    const MISO_API_KEY = process.env.MISO_API_KEY;

    if (!MISO_API_KEY) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
    }


    // MISO API 호출
    const response = await fetch(`${MISO_API_URL}/ext/v1/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorMessage = '페르소나 합성 중 오류가 발생했습니다';
      let errorDetails = null;
      
      try {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details;
        } catch (jsonParseError) {
          errorMessage = errorText || errorMessage;
        }
      } catch (textError) {
        // response body를 읽을 수 없는 경우
        errorMessage = `HTTP ${response.status} ${response.statusText}`;
      }
      
      return NextResponse.json({
        error: errorMessage,
        details: {
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          timestamp: new Date().toISOString()
        }
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const synthesisResult: WorkflowResponse = await response.json();
    
    // 응답에서 outputs 추출 (실제 결과 데이터)
    const outputs = synthesisResult?.data?.outputs || synthesisResult?.outputs;

    // outputs가 있으면 personas 테이블 업데이트 또는 생성
    if (outputs && Object.keys(outputs).length > 0) {
      let insertResult: Persona[] | null = null;
      try {
        if (isNewPersona) {
          // 동일한 company_id와 persona_type을 가진 페르소나가 있는지 다시 확인
          const { data: existingPersona, error: checkError } = await supabase
            .from('personas')
            .select('id')
            .eq('company_id', companyId)
            .eq('persona_type', personaType)
            .eq('active', true) // 활성화된 페르소나만 확인
            .single();

          if (existingPersona && !checkError) {
            // 이미 존재하는 페르소나가 있으면 업데이트
            const updateData: Partial<Persona> = {
              updated_at: new Date().toISOString()
            };

            // 응답에서 받은 필드들로 업데이트 데이터 구성
            if (outputs.persona_summary) updateData.persona_summary = outputs.persona_summary;
            if (outputs.persona_style) updateData.persona_style = outputs.persona_style;
            if (outputs.painpoints) updateData.painpoints = outputs.painpoints;
            if (outputs.needs) updateData.needs = outputs.needs;
            if (outputs.insight) updateData.insight = outputs.insight;
            if (outputs.insight_quote) updateData.insight_quote = outputs.insight_quote;
            if (outputs.thumbnail && outputs.thumbnail !== null) {
              if (typeof outputs.thumbnail === 'string') {
                updateData.thumbnail = outputs.thumbnail;
              } else if (typeof outputs.thumbnail === 'object' && outputs.thumbnail.imageUrl) {
                updateData.thumbnail = outputs.thumbnail.imageUrl;
              }
            }

            const { error: updateError } = await supabase
              .from('personas')
              .update(updateData)
              .eq('id', existingPersona.id)
              .select();

            if (updateError) {
              // Error handling removed
            }
          } else {
            // 신규 페르소나 생성
            // 먼저 새로운 분류 체계에서 매핑 확인
            const { data: typeMapping } = await supabase
              .from('persona_type_mappings')
              .select('combination_id')
              .eq('company_id', companyId)
              .eq('legacy_persona_type', personaType)
              .single();
            
            const insertData = {
              persona_type: personaType,
              persona_description: parsedInterviewee.description || parsedInterviewee.user_description || `${personaType} 타입 사용자`,
              persona_summary: outputs.persona_summary || '',
              persona_style: outputs.persona_style || '',
              painpoints: outputs.painpoints || '',
              needs: outputs.needs || '',
              insight: outputs.insight || '',
              insight_quote: outputs.insight_quote || '',
              thumbnail: (() => {
                // outputs.thumbnail이 문자열 URL이면 바로 사용, 객체면 imageUrl 추출
                if (outputs.thumbnail && outputs.thumbnail !== null) {
                  if (typeof outputs.thumbnail === 'string') {
                    // 이미 URL 문자열인 경우
                    return outputs.thumbnail;
                  } else if (typeof outputs.thumbnail === 'object' && outputs.thumbnail.imageUrl) {
                    // 객체 형태인 경우 imageUrl 추출
                    return outputs.thumbnail.imageUrl;
                  }
                }
                return null;
              })(),
              company_id: companyId,
              project_id: projectId,
              combination_id: typeMapping?.combination_id || null, // 새로운 분류 체계 연결
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { data: insertResultData, error: insertError } = await supabase
              .from('personas')
              .insert([insertData])
              .select();

            insertResult = insertResultData;

            if (insertError) {
              // Error handling removed
            }
          }
        } else {
          // 기존 페르소나 업데이트
          const updateData: Partial<Database['public']['Tables']['personas']['Update']> = {
            updated_at: new Date().toISOString()
          };

          // 응답에서 받은 필드들로 업데이트 데이터 구성
          if (outputs.persona_summary) updateData.persona_summary = outputs.persona_summary;
          if (outputs.persona_style) updateData.persona_style = outputs.persona_style;
          if (outputs.painpoints) updateData.painpoints = outputs.painpoints;
          if (outputs.needs) updateData.needs = outputs.needs;
          if (outputs.insight) updateData.insight = outputs.insight;
          if (outputs.insight_quote) updateData.insight_quote = outputs.insight_quote;
          if (outputs.thumbnail && outputs.thumbnail !== null) {
            // outputs.thumbnail이 문자열 URL이면 바로 사용, 객체면 imageUrl 추출
            if (typeof outputs.thumbnail === 'string') {
              updateData.thumbnail = outputs.thumbnail;
            } else if (typeof outputs.thumbnail === 'object' && outputs.thumbnail.imageUrl) {
              updateData.thumbnail = outputs.thumbnail.imageUrl;
            }
          }


          const { error: updateError } = await supabase
            .from('personas')
            .update(updateData)
            .eq('id', selectedPersona.id)
            .select();

          if (updateError) {
            // Error handling removed
          }
        }

        // 인터뷰 데이터의 persona_reflected 필드를 true로 업데이트
        if (parsedInterviewee.id) {
          const { error: interviewUpdateError } = await supabase
            .from('interviewees')
            .update({
              persona_reflected: true,
              persona_id: isNewPersona && insertResult ? insertResult[0].id : selectedPersona.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', parsedInterviewee.id)
            .select();

          if (interviewUpdateError) {
            // Error handling removed
          }

          // Topic 동기화 실행 (페르소나에 miso_dataset_id가 있을 때만)
          const finalPersonaId = isNewPersona && insertResult ? insertResult[0].id : selectedPersona.id;
          
          // 페르소나의 최신 데이터 조회 (miso_dataset_id 확인)
          const { data: currentPersona } = await supabase
            .from('personas')
            .select('miso_dataset_id')
            .eq('id', finalPersonaId)
            .single();

          if (currentPersona?.miso_dataset_id) {
            try {
              // Topic 동기화 시작
              await syncInterviewTopicsToPersona(
                parsedInterviewee.id,
                finalPersonaId,
                currentPersona.miso_dataset_id
              );
              // Topic 동기화 완료
            } catch (topicSyncError) {
              // Topic 동기화 실패
              // Topic 동기화 실패해도 synthesis 자체는 성공으로 처리
            }
          } else {
            // miso_dataset_id 없어 topic 동기화 건너뜀
          }
        }

      } catch (dbError) {
        // DB 오류가 있어도 합성 결과는 반환
      }
    }

    const responseData: PersonaSynthesisResponse = { 
      success: true,
      data: synthesisResult,
      isNewPersona,
      outputs: outputs as PersonaSynthesisOutputs
    };
    
    return NextResponse.json(responseData);

  } catch (error) {
    return NextResponse.json({ 
      error: '페르소나 합성 처리 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 