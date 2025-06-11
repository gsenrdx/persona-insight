import { NextRequest } from 'next/server'
import { createDataStreamResponse } from 'ai'
import { createClient } from '@supabase/supabase-js'
import { 
  createSystemPrompt, 
  generateOutputConfig,
  DEFAULT_X_AXIS,
  DEFAULT_Y_AXIS,
  DEFAULT_SCORING_GUIDELINES
} from "@/lib/api/persona-criteria"

// 기본 프롬프트 생성 (설정이 없을 때)
function generateDefaultPrompt(): string {
  return `## 출력 예시:
### x_axis / array[object]
\`\`\`
[
  {
    "좌측_score": 60,
    "우측_score": 40
  }
]
\`\`\`
### y_axis / array[object]
\`\`\`
y_axis = [
  {
    "하단_score": 80,
    "상단_score": 20
  }
]
\`\`\`
또는 단서가 없을 경우:
x_axis = null  
y_axis = null

<scoring_guideline>
1. 근거 기반: 키워드, 맥락, 발언 강도 등 구체적 증거만 사용하고 추론이나 가정은 금지합니다.
2. 극단 점수: 한쪽 증거만 명확할 때는 우세 90–100, 열세 0–10을 부여합니다.
3. 상대적 우위: 양측 증거가 존재하면 우세 70–80, 열세 20–30으로 배분합니다. 40–60 점수는 지양하며, 양측이 완전히 동등할 때만 50/50을 사용합니다.
4. 객체 단위 null: 단서 부재 시 해당 객체 전체를 null로 지정합니다.
5. 종합 고려: 빈도뿐 아니라 맥락, 강조, 어조를 함께 평가합니다.
</scoring_guideline>

<x_axis>
"좌측_score": 좌측 특성에 대한 설명

"우측_score": 우측 특성에 대한 설명
</x_axis>

<y_axis>
"하단_score": 하단 특성에 대한 설명

"상단_score": 상단 특성에 대한 설명
</y_axis>`
}

// 동적 프롬프트 생성
function generateDynamicPrompt(config: any): string {
  const outputConfig = config.output_config
  const scoringGuidelines = config.scoring_guidelines
  const xAxis = config.x_axis
  const yAxis = config.y_axis

  return `## 출력 예시:
### ${outputConfig.x_axis_variable_name} / array[object]
\`\`\`
[
  {
    "${outputConfig.x_low_score_field}": 60,
    "${outputConfig.x_high_score_field}": 40
  }
]
\`\`\`
### ${outputConfig.y_axis_variable_name} / array[object]
\`\`\`
${outputConfig.y_axis_variable_name} = [
  {
    "${outputConfig.y_low_score_field}": 80,
    "${outputConfig.y_high_score_field}": 20
  }
]
\`\`\`
또는 단서가 없을 경우:
${outputConfig.x_axis_variable_name} = null  
${outputConfig.y_axis_variable_name} = null

<scoring_guideline>
1. 근거 기반: 키워드, 맥락, 발언 강도 등 구체적 증거만 사용하고 추론이나 가정은 금지합니다.
2. 극단 점수: 한쪽 증거만 명확할 때는 우세 90–100, 열세 0–10을 부여합니다.
3. 상대적 우위: 양측 증거가 존재하면 우세 70–80, 열세 20–30으로 배분합니다. 40–60 점수는 지양하며, 양측이 완전히 동등할 때만 50/50을 사용합니다.
4. 객체 단위 null: 단서 부재 시 해당 객체 전체를 null로 지정합니다.
5. 종합 고려: 빈도뿐 아니라 맥락, 강조, 어조를 함께 평가합니다.
</scoring_guideline>

<${outputConfig.x_axis_variable_name}>
"${outputConfig.x_low_score_field}": ${xAxis.low_end_label}${scoringGuidelines.x_axis_low_description ? ` - ${scoringGuidelines.x_axis_low_description}` : ''}

"${outputConfig.x_high_score_field}": ${xAxis.high_end_label}${scoringGuidelines.x_axis_high_description ? ` - ${scoringGuidelines.x_axis_high_description}` : ''}
</${outputConfig.x_axis_variable_name}>

<${outputConfig.y_axis_variable_name}>
"${outputConfig.y_low_score_field}": ${yAxis.low_end_label}${scoringGuidelines.y_axis_low_description ? ` - ${scoringGuidelines.y_axis_low_description}` : ''}

"${outputConfig.y_high_score_field}": ${yAxis.high_end_label}${scoringGuidelines.y_axis_high_description ? ` - ${scoringGuidelines.y_axis_high_description}` : ''}
</${outputConfig.y_axis_variable_name}>`
}

export const runtime = 'edge'
export const maxDuration = 60 // 시간 제한 60초로 연장

interface UpstreamLine {
  /** 서버가 보내는 이벤트 타입 */
  event?: 'agent_message'
  /** 누적 전체 답변 스냅샷 */
  answer?: string
  /** 기타 필드들 무시 */
  [key: string]: unknown
}

/**
 * interview_detail에서 main_topic을 추출하여 main_topics 테이블에 저장
 * 중복된 토픽은 건너뛰기
 */
async function extractAndSaveMainTopics(supabase: any, interviewDetail: any, companyId: string | null) {
  if (!companyId || !Array.isArray(interviewDetail)) {
    console.log('[메인 토픽 저장] 유효하지 않은 데이터:', { companyId, interviewDetail: typeof interviewDetail });
    return;
  }

  try {
    console.log('[메인 토픽 저장] 시작 - 회사 ID:', companyId);
    
    // interview_detail에서 topic_name 추출
    const topicNames = interviewDetail
      .filter(topic => topic && typeof topic === 'object' && topic.topic_name)
      .map(topic => topic.topic_name.trim())
      .filter(name => name.length > 0);

    console.log('[메인 토픽 저장] 추출된 토픽들:', topicNames);

    if (topicNames.length === 0) {
      console.log('[메인 토픽 저장] 추출할 토픽이 없음');
      return;
    }

    // 각 토픽을 개별적으로 저장 시도 (중복 체크)
    for (const topicName of topicNames) {
      try {
        const { data: insertedTopic, error: topicError } = await supabase
          .from('main_topics')
          .insert([{
            topic_name: topicName,
            company_id: companyId,
          }])
          .select('*');

        if (topicError) {
          // 유니크 제약조건 위배 (중복)인 경우
          if (topicError.code === '23505') {
            console.log(`[메인 토픽 저장] 이미 존재하는 토픽 건너뛰기: "${topicName}"`);
          } else {
            console.error(`[메인 토픽 저장] 토픽 저장 오류 (${topicName}):`, topicError);
          }
        } else {
          console.log(`[메인 토픽 저장] 새 토픽 저장 성공: "${topicName}" (ID: ${insertedTopic?.[0]?.id})`);
        }
      } catch (individualError) {
        console.error(`[메인 토픽 저장] 개별 토픽 처리 오류 (${topicName}):`, individualError);
      }
    }

    console.log('[메인 토픽 저장] 완료');
  } catch (error) {
    console.error('[메인 토픽 저장] 전체 프로세스 오류:', error);
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const projectId = formData.get('projectId') as string;
  
  if (!file) {
    return new Response('파일이 제공되지 않았습니다.', { status: 400 });
  }

  console.log('[MISO Workflow API 요청] 전달된 프로젝트 ID:', projectId);
  
  if (!projectId || projectId === 'undefined' || projectId === 'null') {
    return new Response('프로젝트 ID가 제공되지 않았습니다.', { status: 400 });
  }

  console.log('[MISO Workflow API 요청] 파일 크기:', file.size);
  console.log('[MISO Workflow API 요청] 파일명:', file.name);
  console.log('[MISO Workflow API 요청] 파일 타입:', file.type);
  console.log('[MISO Workflow API 요청] 프로젝트 ID:', projectId);

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

  // Supabase 클라이언트 초기화 (사용자 정보 조회용)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // JWT 토큰에서 사용자 정보 추출
  let userId: string | null = null;
  let companyId: string | null = null;
  let userName: string | null = null;
  let companyName: string | null = null;
  let companyInfo: string | null = null;

  try {
    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('사용자 인증 실패:', userError);
      return new Response('인증에 실패했습니다.', { status: 401 });
    }

    userId = user.id;

    // 사용자 프로필에서 company_id와 회사 정보, 사용자 이름 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        company_id,
        name,
        company:companies(
          id,
          name,
          description
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError || !profile?.company_id || !profile?.company) {
      console.error('사용자 프로필 조회 실패:', profileError);
      return new Response('사용자 정보를 찾을 수 없습니다.', { status: 400 });
    }

    companyId = profile.company_id;
    userName = profile.name;
    
    // company는 단일 객체이므로 안전하게 접근
    const company = Array.isArray(profile.company) ? profile.company[0] : profile.company;
    companyName = company?.name || '';
    companyInfo = company?.description || '';
    
    console.log('[인증 성공] 사용자:', userName, '회사:', companyName, '회사 ID:', companyId);
  } catch (error) {
    console.error('인증 처리 중 오류:', error);
    return new Response('인증 처리 중 오류가 발생했습니다.', { status: 401 });
  }

  // 1단계: 파일을 Miso API에 직접 업로드하고 URL 받기
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);
  uploadFormData.append('user', 'persona-insight-user');
  
  try {
    const uploadResponse = await fetch(`${MISO_API_URL}/ext/v1/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MISO_API_KEY}`,
      },
      body: uploadFormData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('⛔ 파일 업로드 오류', uploadResponse.status, errorText);
      return new Response('파일 업로드 중 오류가 발생했습니다.', { status: 500 });
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('[MISO Workflow API] 파일 업로드 응답:', uploadResult);
    
    // 업로드된 파일 ID 추출
    const fileId = uploadResult.id;
    
    if (!fileId) {
      console.error('⛔ 파일 업로드 응답에서 ID를 찾을 수 없습니다');
      return new Response('파일 업로드 응답이 유효하지 않습니다', { status: 500 });
    }
    
    console.log('[MISO Workflow API] 파일 업로드 성공, ID:', fileId);

    // 파일 타입 결정
    const getFileType = (fileName: string, mimeType: string) => {
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      // 이미지 타입
      if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
        return 'image';
      }
      
      // 오디오 타입  
      if (mimeType.startsWith('audio/') || ['mp3', 'm4a', 'wav', 'webm', 'amr'].includes(extension || '')) {
        return 'audio';
      }
      
      // 비디오 타입
      if (mimeType.startsWith('video/') || ['mp4', 'mov', 'mpeg', 'mpga'].includes(extension || '')) {
        return 'video';
      }
      
      // 문서 타입 (기본값)
      return 'document';
    };

    const fileType = getFileType(file.name, file.type);
    
    // 파일 객체 정의
    const fileObject = {
      type: fileType,
      transfer_method: 'local_file',
      upload_file_id: fileId
    };
    
    // main_topics에서 회사별 토픽 조회 및 string 변환
    let topicsString = '';
    try {
      const { data: topicsData, error: topicsError } = await supabase
        .from('main_topics')
        .select('topic_name')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (!topicsError && topicsData && topicsData.length > 0) {
        topicsString = topicsData.map(t => t.topic_name).join(', ');
      }
    } catch (e) {
      console.error('[워크플로우] 토픽 조회 실패:', e);
    }

    // 페르소나 분류 기준 설정 조회 및 프롬프트 생성
    let promptPersonaCriteria = '';
    try {
      // 회사 ID로 공통 설정 조회
      const { data: config, error: configError } = await supabase
        .from('persona_criteria_configurations')
        .select('*')
        .eq('company_id', companyId)
        .is('project_id', null) // project_id가 없는 회사 공통 설정을 사용
        .eq('is_active', true)
        .single();

      // 최종적으로 설정이 있으면 동적 프롬프트 생성, 없으면 기본값 사용
      if (!configError && config) {
        console.log('[워크플로우] 회사 공통 페르소나 분류 기준 설정 발견');
        // jsonb 필드가 문자열로 반환되는 경우를 대비하여 파싱
        const parsedConfig = {
          ...config,
          x_axis: typeof config.x_axis === 'string' ? JSON.parse(config.x_axis) : config.x_axis,
          y_axis: typeof config.y_axis === 'string' ? JSON.parse(config.y_axis) : config.y_axis,
          output_config: typeof config.output_config === 'string' ? JSON.parse(config.output_config) : config.output_config,
          scoring_guidelines: typeof config.scoring_guidelines === 'string' ? JSON.parse(config.scoring_guidelines) : config.scoring_guidelines,
        };
        promptPersonaCriteria = createSystemPrompt(parsedConfig);
      } else {
        if (configError && configError.code !== 'PGRST116') { // PGRST116: 'exact-one' row was not found
          console.error('[워크플로우] 회사 설정 조회 오류:', configError.message);
        }
        console.log('[워크플로우] 페르소나 분류 기준 설정 없음, 기본 설정으로 프롬프트 생성');
        const defaultConfig = {
          x_axis: DEFAULT_X_AXIS,
          y_axis: DEFAULT_Y_AXIS,
          output_config: generateOutputConfig(DEFAULT_X_AXIS, DEFAULT_Y_AXIS),
          scoring_guidelines: DEFAULT_SCORING_GUIDELINES,
        }
        promptPersonaCriteria = createSystemPrompt(defaultConfig);
      }
    } catch (e) {
      console.error('[워크플로우] 프롬프트 생성 실패:', e);
      const defaultConfig = {
        x_axis: DEFAULT_X_AXIS,
        y_axis: DEFAULT_Y_AXIS,
        output_config: generateOutputConfig(DEFAULT_X_AXIS, DEFAULT_Y_AXIS),
        scoring_guidelines: DEFAULT_SCORING_GUIDELINES,
      }
      promptPersonaCriteria = createSystemPrompt(defaultConfig);
    }

    // 2단계: workflow API 호출 (blocking 모드로 변경)
    const workflowRequestBody = {
      inputs: {
        file_input: fileObject,
        preprocess_type: 'interviewee',
        // company_name: companyName,
        // company_info: companyInfo,
        topics: topicsString, // <-- 토픽 string 추가
        prompt_persona_criteria: promptPersonaCriteria // <-- 프롬프트 추가
      },
      mode: 'blocking', // 스트리밍 모드 대신 블로킹 모드 사용
      user: userName,
      files: [fileObject]
    };

    console.log('[MISO Workflow API] 요청 데이터:', JSON.stringify(workflowRequestBody, null, 2));

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
    
    /* 오류 처리 */
    if (!workflowResponse.ok) {
      let errorMessage = '';
      try {
        errorMessage = await workflowResponse.text();
      } catch (textError) {
        console.error('응답 텍스트 읽기 실패:', textError);
        errorMessage = '';
      }
      
      console.error('⛔ Workflow API 오류 상세 정보:');
      console.error('- 상태 코드:', workflowResponse.status);
      console.error('- 상태 텍스트:', workflowResponse.statusText);
      console.error('- 응답 본문:', errorMessage);
      console.error('- 요청 URL:', `${MISO_API_URL}/ext/v1/workflows/run`);
      console.error('- API 키 존재 여부:', !!MISO_API_KEY);
      console.error('- 사용자 정보:', { userName, companyName, companyInfo });
      
      return new Response(JSON.stringify({
        error: '외부 API 오류',
        details: {
          status: workflowResponse.status,
          statusText: workflowResponse.statusText,
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 응답 결과 파싱
    let workflowResult;
    try {
      workflowResult = await workflowResponse.json();
      console.log('[MISO Workflow API] 분석 결과:', workflowResult);
    } catch (jsonError) {
      console.error('⛔ JSON 파싱 오류:', jsonError);
      return new Response('응답 파싱 중 오류가 발생했습니다.', { status: 500 });
    }
    
    // 실제 API에서 반환될 응답 구조에 따라 파싱 로직 조정
    const output = workflowResult.data?.outputs || workflowResult.outputs || {}; // data 객체 내부의 outputs를 우선 확인
    
    // 분석 결과 구성 (키 이름 수정)
    const analysisResult = {
      type: output.type || output.user_type || "정보 없음", 
      description: output.description || output.user_description || "설명이 없습니다.",
      summary: output.summary || output.interviewee_summary || "요약이 없습니다.",
      date: output.date || output.session_date || "날짜 정보가 없습니다.",
      interviewee_style: output.interviewee_style || "스타일 정보가 없습니다.",
      interviewee_fake_name: output.interviewee_fake_name || null,
      x_axis: output.x_axis || null,
      y_axis: output.y_axis || null,
    };

    // 3단계: 워크플로우 결과를 interviewees 테이블에 저장
    try {
      console.log('[인터뷰이 저장] 시작 - 사용자:', userId, '회사:', companyId);
      console.log('[인터뷰이 저장] 원본 output 데이터:', JSON.stringify(output, null, 2));
      
      // 데이터 변환 및 검증
      const intervieweeData = {
        session_date: output.session_date || new Date().toISOString().split('T')[0],
        user_type: output.user_type || 'A',
        user_description: output.user_description || null,
        x_axis: output.x_axis || null,
        y_axis: output.y_axis || null,
        interviewee_summary: output.interviewee_summary || null,
        interviewee_style: output.interviewee_style || null,
        interviewee_fake_name: output.interviewee_fake_name || null,
        interview_detail: (() => {
          // interviewee_detail 파싱 처리 개선
          try {
            if (!output.interviewee_detail) {
              console.log('[인터뷰이 저장] interviewee_detail 없음');
              return null;
            }

            let rawData = output.interviewee_detail;
            console.log('[인터뷰이 저장] 원본 interviewee_detail 타입:', typeof rawData);
            console.log('[인터뷰이 저장] 원본 interviewee_detail 길이:', typeof rawData === 'string' ? rawData.length : 'N/A');
            console.log('[인터뷰이 저장] 원본 interviewee_detail 첫 100자:', typeof rawData === 'string' ? rawData.substring(0, 100) : rawData);

            // 이미 객체/배열인 경우
            if (typeof rawData !== 'string') {
              console.log('[인터뷰이 저장] interviewee_detail 이미 객체 형태');
              return rawData;
            }

            // 문자열인 경우 정리 및 파싱
            let cleanedData = rawData.trim();
            
            // 앞뒤 불필요한 텍스트 제거 (예: "결과: " 등)
            cleanedData = cleanedData.replace(/^[\s\S]*?(\[[\s\S]*\])[\s\S]*?$/, '$1');
            
            // 마크다운 코드 블록 제거
            cleanedData = cleanedData.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            cleanedData = cleanedData.replace(/^```\s*/, '').replace(/\s*```$/, '');
            
            // 앞뒤 줄바꿈 및 공백 제거
            cleanedData = cleanedData.trim();
            
            console.log('[인터뷰이 저장] 정리된 데이터 첫 100자:', cleanedData.substring(0, 100));
            console.log('[인터뷰이 저장] 정리된 데이터 마지막 50자:', cleanedData.substring(Math.max(0, cleanedData.length - 50)));

            // JSON 파싱 시도
            if (cleanedData.startsWith('[') && cleanedData.endsWith(']')) {
              const parsed = JSON.parse(cleanedData);
              console.log('[인터뷰이 저장] interviewee_detail 파싱 성공:', Array.isArray(parsed) ? `배열 길이: ${parsed.length}` : typeof parsed);
              
              // 파싱된 결과 검증
              if (Array.isArray(parsed)) {
                console.log('[인터뷰이 저장] 총 topic 개수:', parsed.length);
                
                // 각 topic 구조 검증
                const validTopics = parsed.filter((item, index) => {
                  const isValid = item && 
                    typeof item === 'object' && 
                    typeof item.topic_name === 'string' &&
                    Array.isArray(item.painpoint) &&
                    Array.isArray(item.need) &&
                    Array.isArray(item.insight_quote) &&
                    Array.isArray(item.keyword_cluster) &&
                    Array.isArray(item.painpoint_keyword) &&
                    Array.isArray(item.need_keyword);
                  
                  if (isValid) {
                    console.log(`[인터뷰이 저장] Topic ${index + 1} "${item.topic_name}":`, {
                      painpoint: `${item.painpoint.length}개`,
                      need: `${item.need.length}개`,
                      insight_quote: `${item.insight_quote.length}개`,
                      keyword_cluster: `${item.keyword_cluster.length}개`,
                      painpoint_keyword: `${item.painpoint_keyword.length}개`,
                      need_keyword: `${item.need_keyword.length}개`
                    });
                  } else {
                    console.warn(`[인터뷰이 저장] Topic ${index + 1} 구조 검증 실패:`, item);
                  }
                  
                  return isValid;
                });
                
                console.log('[인터뷰이 저장] 유효한 topic 개수:', validTopics.length);
                return validTopics.length > 0 ? validTopics : parsed; // 유효한 것이 있으면 필터링된 것, 없으면 원본
              } else {
                console.warn('[인터뷰이 저장] 파싱된 결과가 배열이 아님:', typeof parsed);
                return parsed;
              }
            } 
            // 단일 객체인 경우 배열로 변환 시도
            else if (cleanedData.startsWith('{') && cleanedData.endsWith('}')) {
              console.log('[인터뷰이 저장] 단일 객체 감지, 배열로 변환 시도');
              const singleObject = JSON.parse(cleanedData);
              
              // 단일 객체 구조 검증
              const isValidTopic = singleObject && 
                typeof singleObject === 'object' && 
                typeof singleObject.topic_name === 'string' &&
                Array.isArray(singleObject.painpoint) &&
                Array.isArray(singleObject.need) &&
                Array.isArray(singleObject.insight_quote) &&
                Array.isArray(singleObject.keyword_cluster) &&
                Array.isArray(singleObject.painpoint_keyword) &&
                Array.isArray(singleObject.need_keyword);
              
              if (isValidTopic) {
                console.log('[인터뷰이 저장] 단일 topic을 배열로 변환:', singleObject.topic_name);
                return [singleObject]; // 배열로 감싸서 반환
              } else {
                console.warn('[인터뷰이 저장] 단일 객체 구조 검증 실패:', singleObject);
                return [singleObject]; // 구조가 틀려도 배열로 감싸서 반환
              }
            } 
            else {
              console.error('[인터뷰이 저장] JSON 형태가 올바르지 않음 - 올바른 시작/끝 문자가 아님');
              console.error('[인터뷰이 저장] 시작 문자:', cleanedData.charAt(0));
              console.error('[인터뷰이 저장] 끝 문자:', cleanedData.charAt(cleanedData.length - 1));
              return null;
            }
            
          } catch (parseError) {
            console.error('[인터뷰이 저장] interview_detail 파싱 실패:', parseError);
            console.error('[인터뷰이 저장] 파싱 실패한 데이터:', output.interviewee_detail);
            
            // 파싱 실패 시 원본 문자열을 그대로 저장 시도
            try {
              return typeof output.interviewee_detail === 'string' ? output.interviewee_detail : null;
            } catch {
              return null;
            }
          }
        })(),
        thumbnail: (() => {
          try {
            if (output.thumbnail && typeof output.thumbnail === 'string') {
              // JSON 형태인지 확인 후 파싱 시도
              if (output.thumbnail.startsWith('{') || output.thumbnail.startsWith('[')) {
                try {
                  const thumbnailData = JSON.parse(output.thumbnail);
                  return thumbnailData.success ? thumbnailData.imageUrl : thumbnailData.imageUrl || thumbnailData;
                } catch {
                  // JSON 파싱 실패 시 문자열 그대로 반환 (URL일 가능성)
                  return output.thumbnail;
                }
              } else {
                // JSON이 아닌 일반 문자열 (URL)인 경우 그대로 반환
                return output.thumbnail;
              }
            }
            return output.thumbnail || null;
          } catch (parseError) {
            console.warn('[인터뷰이 저장] thumbnail 파싱 실패:', parseError);
            return null;
          }
        })(),
        company_id: companyId,
        project_id: projectId,
        created_by: userId,
        created_at: new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString(),
        updated_at: new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString()
      };

      console.log('[인터뷰이 저장] 변환된 데이터:', JSON.stringify(intervieweeData, null, 2));

      // Supabase에 데이터 삽입
      const { data: insertedData, error: insertError } = await supabase
        .from('interviewees')
        .insert([intervieweeData])
        .select('*');

      if (insertError) {
        console.error('[인터뷰이 저장] 데이터베이스 오류:', insertError);
        // 저장 실패해도 워크플로우 결과는 반환
      } else {
        console.log('[인터뷰이 저장] 성공:', insertedData?.[0]?.id);
        console.log('[인터뷰이 저장] 저장된 interview_detail 타입:', typeof insertedData?.[0]?.interview_detail);
        
        // 저장된 interview_detail 분석
        const savedDetail = insertedData?.[0]?.interview_detail;
        if (Array.isArray(savedDetail)) {
          console.log('[인터뷰이 저장] 저장된 topic 개수:', savedDetail.length);
          savedDetail.forEach((topic, index) => {
            if (topic && typeof topic === 'object' && topic.topic_name) {
              console.log(`[인터뷰이 저장] 저장된 Topic ${index + 1}: "${topic.topic_name}"`);
            }
          });
        } else {
          console.log('[인터뷰이 저장] 저장된 interview_detail 내용:', savedDetail);
        }

        // main_topics 테이블에 토픽 추출 및 저장
        await extractAndSaveMainTopics(supabase, savedDetail, companyId);
      }
    } catch (saveError) {
      console.error('[인터뷰이 저장] 예외 발생:', saveError);
      // 저장 실패해도 워크플로우 결과는 반환
    }
    
    // JSON 응답으로 반환 (기존 형식 유지)
    return new Response(JSON.stringify(analysisResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('⛔ 요청 처리 중 오류 발생', error);
    return new Response('서버 내부 오류가 발생했습니다.', { status: 500 });
  }
} 