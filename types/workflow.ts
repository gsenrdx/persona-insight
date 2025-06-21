// Workflow and MISO API type definitions

import { Json } from './database'

export interface WorkflowInputs {
  preprocess_type: 'interview' | 'persona'
  selected_interviewee?: string
  selected_persona?: string
  active_generate_image?: string
  [key: string]: string | undefined
}

export interface WorkflowFile {
  name: string
  content?: string
  data?: string
}

export interface WorkflowRequest {
  inputs: WorkflowInputs
  mode: 'blocking' | 'streaming'
  user: string
  files: WorkflowFile[]
}

export interface WorkflowResponse {
  data?: {
    outputs?: Record<string, unknown>
    [key: string]: unknown
  }
  outputs?: Record<string, unknown>
  error?: string
  details?: unknown
}

// Persona synthesis types
export interface PersonaSynthesisInputs {
  selectedInterviewee: IntervieweeData | string
  personaType: string
  projectId?: string
  personaId?: string
}

export interface IntervieweeData {
  id?: string
  description?: string
  user_description?: string
  [key: string]: unknown
}

export interface PersonaSynthesisOutputs {
  persona_summary?: string
  persona_style?: string
  painpoints?: string
  needs?: string
  insight?: string
  insight_quote?: string
  thumbnail?: string | { imageUrl: string } | null
}

export interface PersonaSynthesisResponse {
  success: boolean
  data?: WorkflowResponse
  isNewPersona?: boolean
  outputs?: PersonaSynthesisOutputs
  error?: string
  details?: unknown
}

// Topic sync types
export interface TopicDocument {
  topic_id: string
  topic_name: string
  interview_count: number
  content: string
}

export interface TopicSyncResult {
  success: boolean
  documentsCreated: number
  documentsUpdated: number
  error?: string
}