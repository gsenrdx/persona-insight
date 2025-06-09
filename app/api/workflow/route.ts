import { NextRequest } from 'next/server'
import { createDataStreamResponse } from 'ai'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return new Response('파일이 제공되지 않았습니다.', { status: 400 });
  }

  console.log('[MISO Workflow API 요청] 파일 크기:', file.size);
  console.log('[MISO Workflow API 요청] 파일명:', file.name);
  console.log('[MISO Workflow API 요청] 파일 타입:', file.type);

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
    
    // 2단계: workflow API 호출 (blocking 모드로 변경)
    const workflowRequestBody = {
      inputs: {
        file_input: fileObject,
        preprocess_type: 'interviewee',
        // 문제 발생 시 아래 두 줄을 주석 처리하고 테스트
        // company_name: companyName,
        // company_info: companyInfo
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
      const err = await workflowResponse.text().catch(() => '')
      console.error('⛔ Workflow API 오류 상세 정보:');
      console.error('- 상태 코드:', workflowResponse.status);
      console.error('- 상태 텍스트:', workflowResponse.statusText);
      console.error('- 응답 본문:', err);
      console.error('- 요청 URL:', `${MISO_API_URL}/ext/v1/workflows/run`);
      console.error('- API 키 존재 여부:', !!MISO_API_KEY);
      console.error('- 사용자 정보:', { userName, companyName, companyInfo });
      
      return new Response(JSON.stringify({
        error: '외부 API 오류',
        details: {
          status: workflowResponse.status,
          statusText: workflowResponse.statusText,
          message: err,
          timestamp: new Date().toISOString()
        }
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 응답 결과 파싱
    const workflowResult = await workflowResponse.json();
    console.log('[MISO Workflow API] 분석 결과:', workflowResult);
    
    // 실제 API에서 반환될 응답 구조에 따라 파싱 로직 조정
    const output = workflowResult.data?.outputs || workflowResult.outputs || {}; // data 객체 내부의 outputs를 우선 확인
    
    // 분석 결과 구성 (키 이름 수정)
    const analysisResult = {
      type: output.type || output.user_type || "정보 없음", 
      description: output.description || output.user_description || "설명이 없습니다.",
      summary: output.summary || output.interviewee_summary || "요약이 없습니다.",
      date: output.date || output.session_date || "날짜 정보가 없습니다.",
      interviewee_style: output.interviewee_style || "스타일 정보가 없습니다.",
      charging_pattern_scores: output.charging_pattern_scores || [
        {
          "home_centric_score": 0,
          "road_centric_score": 0
        }
      ],
      value_orientation_scores: output.value_orientation_scores || [
        {
          "cost_driven_score": 0,
          "tech_brand_driven_score": 0
        }
      ]
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
        charging_pattern_scores: output.charging_pattern_scores || null,
        value_orientation_scores: output.value_orientation_scores || null,
        interviewee_summary: output.interviewee_summary || null,
        interviewee_style: output.interviewee_style || null,
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
              const thumbnailData = JSON.parse(output.thumbnail);
              return thumbnailData.success ? thumbnailData.imageUrl : null;
            }
            return output.thumbnail || null;
          } catch (parseError) {
            console.warn('[인터뷰이 저장] thumbnail 파싱 실패:', parseError);
            return null;
          }
        })(),
        company_id: companyId,
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