// 페르소나 분류 기준 설정 관련 API 함수들

export interface Segment {
  name: string
  description: string
  is_unclassified: boolean
}

export interface Axis {
  name: string
  description: string
  low_end_label: string
  high_end_label: string
  segments: Segment[]
}

export interface UnclassifiedCell {
  xIndex: number
  yIndex: number
}

export interface PersonaMatrixItem {
  id: string
  xIndex: number
  yIndex: number
  title: string
  subtitle: string
  description: string
}

export interface OutputConfig {
  x_axis_variable_name: string
  y_axis_variable_name: string
  x_low_score_field: string
  x_high_score_field: string
  y_low_score_field: string
  y_high_score_field: string
}

export interface ScoringGuidelines {
  x_axis_low_description: string
  x_axis_high_description: string
  y_axis_low_description: string
  y_axis_high_description: string
}

export interface PersonaCriteriaConfiguration {
  id: string
  project_id: string | null
  company_id: string
  x_axis: Axis
  y_axis: Axis
  unclassified_cells: UnclassifiedCell[]
  persona_matrix: Record<string, PersonaMatrixItem>
  output_config: OutputConfig
  scoring_guidelines: ScoringGuidelines
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CreatePersonaCriteriaData {
  project_id?: string
  company_id: string
  x_axis: Axis
  y_axis: Axis
  unclassified_cells: UnclassifiedCell[]
  persona_matrix: Record<string, PersonaMatrixItem>
  output_config: OutputConfig
  scoring_guidelines: ScoringGuidelines
  created_by: string
}

export interface UpdatePersonaCriteriaData {
  id: string
  user_id: string
  project_id?: string
  company_id: string
  x_axis: Axis
  y_axis: Axis
  unclassified_cells: UnclassifiedCell[]
  persona_matrix: Record<string, PersonaMatrixItem>
  output_config: OutputConfig
  scoring_guidelines: ScoringGuidelines
}

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

// 동적 시스템 프롬프트 생성
export async function generateSystemPrompt(
  companyId: string,
  projectId?: string
): Promise<string> {
  const response = await fetch('/api/supabase/persona-criteria/prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ company_id: companyId, project_id: projectId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '시스템 프롬프트 생성에 실패했습니다.')
  }

  const data = await response.json()
  return data.prompt
}

// 기본 설정값들
export const DEFAULT_X_AXIS: Axis = {
  name: '충전 패턴 축',
  description: '사용자가 주로 어떤 상황과 방식으로 전기차를 충전하는지에 대한 패턴을 나타냅니다.',
  low_end_label: '루틴형',
  high_end_label: '즉시형',
  segments: [
    { name: '가로 유형 1', description: '', is_unclassified: false },
    { name: '가로 유형 2', description: '', is_unclassified: false },
    { name: '가로 유형 3', description: '', is_unclassified: false },
  ],
}

export const DEFAULT_Y_AXIS: Axis = {
  name: '가치 지향',
  description: '사용자가 충전 서비스에서 어떤 가치를 가장 중요하게 생각하는지를 나타냅니다.',
  low_end_label: '가성비',
  high_end_label: '속도/경험',
  segments: [
    { name: '세로 유형 1', description: '', is_unclassified: false },
    { name: '세로 유형 2', description: '', is_unclassified: false },
    { name: '세로 유형 3', description: '', is_unclassified: false },
  ],
}

export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  x_axis_variable_name: 'charging_pattern_scores',
  y_axis_variable_name: 'value_orientation_scores',
  x_low_score_field: 'home_centric_score',
  x_high_score_field: 'road_centric_score',
  y_low_score_field: 'cost_driven_score',
  y_high_score_field: 'tech_brand_driven_score',
}

export const DEFAULT_SCORING_GUIDELINES: ScoringGuidelines = {
  x_axis_low_description: '사용자가 예측 가능한 단거리 운행에 집중하며 자택·직장의 완속 충전에 주로 의존하는 성향. 상승 요소: 규칙적·계획적 충전 루틴, 충전 스트레스의 부재, 장거리 운행 필요성이 미약함. 하락 요소: 이동 중 급속 충전에 빈번히 의존하거나 외부 인프라 부족을 호소할 경우.',
  x_axis_high_description: '사용자가 장거리 및 즉흥적 운행을 자주 수행하며 고속도로·외부 급속 충전을 핵심 수단으로 삼는 성향. 상승 요소: 장거리 주행 빈도, 충전 속도와 접근성의 중요성, 여행·출장 중심 운행 패턴이 강조될수록. 하락 요소: 거의 집에서만 충전하거나 장거리 운행을 회피한다는 진술이 뚜렷하면.',
  y_axis_low_description: '사용자가 충전 및 서비스 선택 시 경제적 이득과 비용 효율성을 최우선으로 고려하는 정도. 상승 요소: 할인, 무료, 포인트 적립 등 금전적 혜택에 민감하거나 가격 변동에 즉각 반응할수록. 하락 요소: 프리미엄 기능이나 브랜드 가치를 위해 추가 비용을 감수하려는 의향이 드러나면.',
  y_axis_high_description: '사용자가 최신 기술, 브랜드, 프리미엄 경험을 중시하여 비용보다 혁신성·사용자 경험·이미지를 우선시하는 정도. 상승 요소: 혁신적 기능 기대, 사용 편의성 및 디자인 호평, 특정 브랜드에 대한 신뢰가 강조될수록. 하락 요소: 브랜드 무관 또는 단순 저비용 선호 발언이 두드러지면.',
} 