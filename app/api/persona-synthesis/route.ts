import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { selectedInterviewee, personaType } = await req.json();
    
    if (!selectedInterviewee || !personaType) {
      return NextResponse.json({ 
        error: 'selectedInterviewee와 personaType이 필요합니다.' 
      }, { status: 400 });
    }

    console.log('[페르소나 합성 API] 요청 데이터:', { selectedInterviewee, personaType });

    // Authorization 헤더에서 사용자 정보 추출
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: '인증 정보가 필요합니다.' }, { status: 401 });
    }

    // Supabase 클라이언트 초기화 (사용자 정보 조회용)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // JWT 토큰에서 사용자 정보 추출
    let userId: string | null = null;
    let companyId: string | null = null;
    let userName: string | null = null;

    try {
      const token = authorization.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error('사용자 인증 실패:', userError);
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
        console.error('사용자 프로필 조회 실패:', profileError);
        return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 400 });
      }

      companyId = profile.company_id;
      userName = profile.name;
      
      console.log('[페르소나 합성] 인증 성공 - 사용자:', userName, '회사 ID:', companyId);
    } catch (error) {
      console.error('인증 처리 중 오류:', error);
      return NextResponse.json({ error: '인증 처리 중 오류가 발생했습니다.' }, { status: 401 });
    }

    // personas 테이블에서 해당 persona_type의 데이터 조회
    const { data: personas, error: personasError } = await supabase
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
        thumbnail
      `)
      .eq('company_id', companyId)
      .eq('persona_type', personaType);

    if (personasError) {
      console.error('페르소나 데이터 조회 실패:', personasError);
      return NextResponse.json({ error: '페르소나 데이터를 조회하는데 실패했습니다.' }, { status: 500 });
    }

    // selectedInterviewee가 문자열이면 JSON 파싱 시도
    let parsedInterviewee = selectedInterviewee;
    if (typeof selectedInterviewee === 'string') {
      try {
        parsedInterviewee = JSON.parse(selectedInterviewee);
      } catch (e) {
        console.log('[페르소나 합성] selectedInterviewee 파싱 실패, 문자열 그대로 사용');
        parsedInterviewee = { user_description: selectedInterviewee };
      }
    }

    let selectedPersona;
    let isNewPersona = false;
    let activeGenerateImage = "false";

    if (!personas || personas.length === 0) {
      // 기존 페르소나가 없으면 신규 생성을 위한 기본 구조 생성
      console.log(`[페르소나 합성] ${personaType} 타입의 페르소나가 없어서 신규 생성 준비`);
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
      activeGenerateImage = (!selectedPersona.thumbnail || selectedPersona.thumbnail === null || selectedPersona.thumbnail.trim() === '') ? "true" : "false";
      
      console.log(`[페르소나 합성] 기존 ${personaType} 페르소나 발견, 업데이트 진행`);
      console.log(`[페르소나 합성] 기존 thumbnail: ${selectedPersona.thumbnail}, active_generate_image: ${activeGenerateImage}`);
    }

    // MISO API 호출을 위한 데이터 준비
    const requestBody = {
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
      console.error('⛔ MISO_API_KEY 환경변수가 설정되지 않았습니다');
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    console.log('[페르소나 합성] MISO API 요청:', JSON.stringify(requestBody, null, 2));

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
        const errorData = await response.json();
        console.error('[페르소나 합성] API 오류 응답:', errorData);
        errorMessage = errorData.error || errorMessage;
        errorDetails = errorData.details;
      } catch (parseError) {
        const errorText = await response.text();
        console.error('[페르소나 합성] API 응답 상태:', response.status, response.statusText);
        console.error('[페르소나 합성] API 오류 응답:', errorText);
        errorMessage = errorText || errorMessage;
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

    const synthesisResult = await response.json();
    console.log('[페르소나 합성] MISO API 응답:', synthesisResult);
    
    // 응답에서 outputs 추출 (실제 결과 데이터)
    const outputs = synthesisResult?.data?.outputs || synthesisResult?.outputs;
    console.log('[페르소나 합성] outputs:', outputs);

    // outputs가 있으면 personas 테이블 업데이트 또는 생성
    if (outputs && Object.keys(outputs).length > 0) {
      try {
        if (isNewPersona) {
          // 신규 페르소나 생성
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('[페르소나 합성] 신규 페르소나 생성 데이터:', insertData);

          const { data: insertResult, error: insertError } = await supabase
            .from('personas')
            .insert([insertData])
            .select();

          if (insertError) {
            console.error('[페르소나 합성] 신규 페르소나 생성 실패:', insertError);
          } else {
            console.log('[페르소나 합성] 신규 페르소나 생성 성공:', insertResult);
          }
        } else {
          // 기존 페르소나 업데이트
          const updateData: any = {
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

          console.log('[페르소나 합성] 업데이트할 데이터:', updateData);

          const { data: updateResult, error: updateError } = await supabase
            .from('personas')
            .update(updateData)
            .eq('company_id', companyId)
            .eq('persona_type', personaType)
            .select();

          if (updateError) {
            console.error('[페르소나 합성] 페르소나 업데이트 실패:', updateError);
          } else {
            console.log('[페르소나 합성] 페르소나 업데이트 성공:', updateResult);
          }
        }
      } catch (dbError) {
        console.error('[페르소나 합성] 데이터베이스 작업 중 오류:', dbError);
        // DB 오류가 있어도 합성 결과는 반환
      }
    } else {
      console.log('[페르소나 합성] outputs가 없어서 데이터베이스 작업을 건너뜁니다.');
    }

    return NextResponse.json({ 
      success: true,
      data: synthesisResult,
      isNewPersona,
      outputs: outputs
    });

  } catch (error: any) {
    console.error('[페르소나 합성] API 오류:', error);
    return NextResponse.json({ 
      error: '페르소나 합성 처리 중 오류가 발생했습니다.',
      details: error.message 
    }, { status: 500 });
  }
} 