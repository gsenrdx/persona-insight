// 페르소나 분류 기준 설정 관련 API 함수들

import {
  Axis,
  PersonaCriteriaConfiguration,
  CreatePersonaCriteriaData,
  UpdatePersonaCriteriaData,
  OutputConfig,
  ScoringGuidelines
} from '@/types/persona-criteria'

// 페르소나 분류 기준 설정 조회
export async function fetchPersonaCriteria(
  companyId: string,
  projectId?: string
): Promise<PersonaCriteriaConfiguration | null> {
  const params = new URLSearchParams({ company_id: companyId })
  if (projectId) {
    params.append('project_id', projectId)
  }

  const response = await fetch(`/api/supabase/persona-criteria?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '페르소나 분류 기준을 불러오는데 실패했습니다.')
  }

  const data = await response.json()
  return data.configuration || null
}

// 페르소나 분류 기준 설정 생성
export async function createPersonaCriteria(
  criteriaData: CreatePersonaCriteriaData
): Promise<PersonaCriteriaConfiguration> {
  const response = await fetch('/api/supabase/persona-criteria', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(criteriaData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '페르소나 분류 기준 생성에 실패했습니다.')
  }

  const data = await response.json()
  return data.configuration
}

// 페르소나 분류 기준 설정 업데이트
export async function updatePersonaCriteria(
  criteriaData: UpdatePersonaCriteriaData
): Promise<PersonaCriteriaConfiguration> {
  const response = await fetch('/api/supabase/persona-criteria', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(criteriaData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '페르소나 분류 기준 업데이트에 실패했습니다.')
  }

  const data = await response.json()
  return data.configuration
}

// 페르소나 분류 기준 설정 삭제
export async function deletePersonaCriteria(configId: string): Promise<void> {
  const response = await fetch(`/api/supabase/persona-criteria?id=${configId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '페르소나 분류 기준 삭제에 실패했습니다.')
  }
}

// 시스템 프롬프트 생성 (중앙화된 로직)
export function createSystemPrompt(config: {
  x_axis: Axis;
  y_axis: Axis;
  output_config: OutputConfig;
  scoring_guidelines: ScoringGuidelines;
}): string {
  const { x_axis, y_axis, output_config, scoring_guidelines } = config

  return `<output_instructions>
**중요** : 다음 두 개의 항목을 각각 별도로 추출하십시오. 각 항목은 **배열 형태의 JSON 객체 (array[object])**로 출력되어야 하며, 내부 점수 합계는 항상 100(정수)입니다. 
- 정보가 전혀 없어 판단이 불가능한 경우 해당 항목은 null로 설정하십시오. 
## 출력 예시:
### ${output_config.x_axis_variable_name} / array[object]
\`\`\`
[
  {
    "${output_config.x_low_score_field}": 60,
    "${output_config.x_high_score_field}": 40
  }
]
\`\`\`
### ${output_config.y_axis_variable_name} / array[object]
\`\`\`
${output_config.y_axis_variable_name} = [
  {
    "${output_config.y_low_score_field}": 80,
    "${output_config.y_high_score_field}": 20
  }
]
\`\`\`
또는 단서가 없을 경우:
${output_config.x_axis_variable_name} = null  
${output_config.y_axis_variable_name} = null
</output_instructions>

<scoring_guideline>
1. 근거 기반: 키워드, 맥락, 발언 강도 등 구체적 증거만 사용하고 추론이나 가정은 금지합니다.
2. 극단 점수: 한쪽 증거만 명확할 때는 우세 90–100, 열세 0–10을 부여합니다.
3. 상대적 우위: 양측 증거가 존재하면 우세 70–80, 열세 20–30으로 배분합니다. 40–60 점수는 지양하며, 양측이 완전히 동등할 때만 50/50을 사용합니다.
4. 객체 단위 null: 단서 부재 시 해당 객체 전체를 null로 지정합니다.
5. 종합 고려: 빈도뿐 아니라 맥락, 강조, 어조를 함께 평가합니다.
</scoring_guideline>

<${output_config.x_axis_variable_name}>
"${output_config.x_low_score_field}": ${x_axis.low_end_label}${scoring_guidelines.x_axis_low_description ? ` - ${scoring_guidelines.x_axis_low_description}` : ''}

"${output_config.x_high_score_field}": ${x_axis.high_end_label}${scoring_guidelines.x_axis_high_description ? ` - ${scoring_guidelines.x_axis_high_description}` : ''}
</${output_config.x_axis_variable_name}>

<${output_config.y_axis_variable_name}>
"${output_config.y_low_score_field}": ${y_axis.low_end_label}${scoring_guidelines.y_axis_low_description ? ` - ${scoring_guidelines.y_axis_low_description}` : ''}

"${output_config.y_high_score_field}": ${y_axis.high_end_label}${scoring_guidelines.y_axis_high_description ? ` - ${scoring_guidelines.y_axis_high_description}` : ''}
</${output_config.y_axis_variable_name}>`
}

// 축 설정에 따른 output_config 자동 생성 함수
export function generateOutputConfig(xAxis: Axis, yAxis: Axis): OutputConfig {
  return {
    x_axis_variable_name: 'x_axis',
    y_axis_variable_name: 'y_axis',
    x_low_score_field: `${xAxis.low_end_label.toLowerCase().replace(/\s+/g, '_')}_score`,
    x_high_score_field: `${xAxis.high_end_label.toLowerCase().replace(/\s+/g, '_')}_score`,
    y_low_score_field: `${yAxis.low_end_label.toLowerCase().replace(/\s+/g, '_')}_score`,
    y_high_score_field: `${yAxis.high_end_label.toLowerCase().replace(/\s+/g, '_')}_score`,
  }
}

// 페르소나 매트릭스 좌표 생성 함수
export function generatePersonaMatrixCoordinates(xSegmentCount: number, ySegmentCount: number): Array<{xIndex: number, yIndex: number, label: string}> {
  const coordinates = []
  for (let y = 0; y < ySegmentCount; y++) {
    for (let x = 0; x < xSegmentCount; x++) {
      // 알파벳 + 숫자 형태로 좌표 생성 (A1, A2, B1, B2...)
      const label = String.fromCharCode(65 + y) + (x + 1)
      coordinates.push({ xIndex: x, yIndex: y, label })
    }
  }
  return coordinates
} 