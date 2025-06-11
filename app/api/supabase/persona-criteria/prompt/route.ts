import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

// 동적 시스템 프롬프트 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { company_id, project_id } = body
    
    if (!company_id) {
      return NextResponse.json(
        { error: "company_id가 필요합니다" }, 
        { status: 400 }
      )
    }

    // 프로젝트별 설정 우선, 없으면 회사별 설정
    let query = supabaseAdmin
      .from('persona_criteria_configurations')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true)

    if (project_id) {
      query = query.eq('project_id', project_id)
    } else {
      query = query.is('project_id', null)
    }

    const { data: config, error } = await query.single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Supabase 조회 오류:", error)
      return NextResponse.json(
        { error: "페르소나 분류 기준을 가져오는데 실패했습니다" }, 
        { status: 500 }
      )
    }

    // 설정이 없으면 기본 프롬프트 반환
    if (!config) {
      return NextResponse.json({ 
        prompt: generateDefaultPrompt() 
      })
    }

    // 동적 프롬프트 생성
    const dynamicPrompt = generateDynamicPrompt(config)
    
    return NextResponse.json({ prompt: dynamicPrompt })
  } catch (error) {
    console.error("POST API route error:", error)
    
    return NextResponse.json(
      { error: "시스템 프롬프트 생성에 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 기본 프롬프트 생성 (설정이 없을 때)
function generateDefaultPrompt(): string {
  return `## 출력 예시:
### charging_pattern_scores / array[object]
\`\`\`
[
  {
    "home_centric_score": 60,
    "road_centric_score": 40
  }
]
\`\`\`
### value_orientation_scores / array[object]
\`\`\`
value_orientation_scores = [
  {
    "cost_driven_score": 80,
    "tech_brand_driven_score": 20
  }
]
\`\`\`
또는 단서가 없을 경우:
charging_pattern_scores = null  
value_orientation_scores = null

<scoring_guideline>
1. 근거 기반: 키워드, 맥락, 발언 강도 등 구체적 증거만 사용하고 추론이나 가정은 금지합니다.
2. 극단 점수: 한쪽 증거만 명확할 때는 우세 90–100, 열세 0–10을 부여합니다.
3. 상대적 우위: 양측 증거가 존재하면 우세 70–80, 열세 20–30으로 배분합니다. 40–60 점수는 지양하며, 양측이 완전히 동등할 때만 50/50을 사용합니다.
4. 객체 단위 null: 단서 부재 시 해당 객체 전체를 null로 지정합니다.
5. 종합 고려: 빈도뿐 아니라 맥락, 강조, 어조를 함께 평가합니다.
</scoring_guideline>

<charging_pattern_scores>
"home_centric_score": 사용자가 예측 가능한 단거리 운행에 집중하며 자택·직장의 완속 충전에 주로 의존하는 성향.
 -상승 요소: 규칙적·계획적 충전 루틴, 충전 스트레스의 부재, 장거리 운행 필요성이 미약함을 시사할수록 점수 상승.
 -하락 요소: 이동 중 급속 충전에 빈번히 의존하거나 외부 인프라 부족을 호소할 경우 점수 하락.

"road_centric_score":
 사용자가 장거리 및 즉흥적 운행을 자주 수행하며 고속도로·외부 급속 충전을 핵심 수단으로 삼는 성향.
 -상승 요소: 장거리 주행 빈도, 충전 속도와 접근성의 중요성, 여행·출장 중심 운행 패턴이 강조될수록 점수 상승.
 -하락 요소: 거의 집에서만 충전하거나 장거리 운행을 회피한다는 진술이 뚜렷하면 점수 하락.
</charging_pattern_scores>

<value_orientation_scores>
"cost_driven_score": 사용자가 충전 및 서비스 선택 시 경제적 이득과 비용 효율성을 최우선으로 고려하는 정도.
-상승 요소: 할인, 무료, 포인트 적립 등 금전적 혜택에 민감하거나 가격 변동에 즉각 반응할수록 점수 상승.
-하락 요소: 프리미엄 기능이나 브랜드 가치를 위해 추가 비용을 감수하려는 의향이 드러나면 점수 하락.

"tech_brand_driven_score": 사용자가 최신 기술, 브랜드, 프리미엄 경험을 중시하여 비용보다 혁신성·사용자 경험·이미지를 우선시하는 정도.
-상승 요소: 혁신적 기능 기대, 사용 편의성 및 디자인 호평, 특정 브랜드에 대한 신뢰가 강조될수록 점수 상승.
-하락 요소: 브랜드 무관 또는 단순 저비용 선호 발언이 두드러지면 점수 하락.
</value_orientation_scores>`
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
"${outputConfig.x_low_score_field}": ${xAxis.low_end_label} - ${scoringGuidelines.x_axis_low_description}

"${outputConfig.x_high_score_field}": ${xAxis.high_end_label} - ${scoringGuidelines.x_axis_high_description}
</${outputConfig.x_axis_variable_name}>

<${outputConfig.y_axis_variable_name}>
"${outputConfig.y_low_score_field}": ${yAxis.low_end_label} - ${scoringGuidelines.y_axis_low_description}

"${outputConfig.y_high_score_field}": ${yAxis.high_end_label} - ${scoringGuidelines.y_axis_high_description}
</${outputConfig.y_axis_variable_name}>`
} 