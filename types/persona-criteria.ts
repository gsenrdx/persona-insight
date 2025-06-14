// 페르소나 분류 기준 설정 관련 타입 정의

import { ApiResponse } from './api'

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
  description: string
  personaType?: string
  thumbnail?: string
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

// Supabase 테이블 기반 설정 데이터
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

// API 응답 타입들
export interface PersonaCriteriaApiResponse extends ApiResponse<PersonaCriteriaConfiguration | null> {}

// 기본 설정값들 - 범용적으로 변경
export const DEFAULT_X_AXIS: Axis = {
  name: 'X축',
  description: 'X축에 대한 설명을 입력하세요.',
  low_end_label: '좌측',
  high_end_label: '우측',
  segments: [
    { name: 'X축 구분 1', description: '', is_unclassified: false },
    { name: 'X축 구분 2', description: '', is_unclassified: false },
    { name: 'X축 구분 3', description: '', is_unclassified: false },
  ],
}

export const DEFAULT_Y_AXIS: Axis = {
  name: 'Y축',
  description: 'Y축에 대한 설명을 입력하세요.',
  low_end_label: '하단',
  high_end_label: '상단',
  segments: [
    { name: 'Y축 구분 1', description: '', is_unclassified: false },
    { name: 'Y축 구분 2', description: '', is_unclassified: false },
    { name: 'Y축 구분 3', description: '', is_unclassified: false },
  ],
}

export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  x_axis_variable_name: 'x_axis_scores',
  y_axis_variable_name: 'y_axis_scores',
  x_low_score_field: 'low_score',
  x_high_score_field: 'high_score',
  y_low_score_field: 'low_score',
  y_high_score_field: 'high_score',
}

export const DEFAULT_SCORING_GUIDELINES: ScoringGuidelines = {
  x_axis_low_description: '',
  x_axis_high_description: '',
  y_axis_low_description: '',
  y_axis_high_description: '',
}