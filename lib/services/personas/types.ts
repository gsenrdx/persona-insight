export interface PersonaSynthesisParams {
  selectedInterviewee: any
  personaType: string
  projectId?: string
  personaId?: string
  userId: string
  companyId: string
  userName: string
}

export interface PersonaSynthesisResult {
  success: boolean
  data: any
  isNewPersona: boolean
  outputs: PersonaSynthesisOutputs
}

export interface PersonaSynthesisOutputs {
  persona_summary?: string
  persona_style?: string
  painpoints?: string
  needs?: string
  insight?: string
  insight_quote?: string
  thumbnail?: string | { imageUrl: string }
}

export interface WorkflowRequest {
  inputs: {
    preprocess_type: string
    selected_interviewee: string
    selected_persona: string
    active_generate_image: string
  }
  mode: string
  user: string
  files: any[]
}

export interface Persona {
  id?: string
  persona_type: string
  persona_description: string
  persona_summary: string
  persona_style: string
  painpoints: string
  needs: string
  insight: string
  insight_quote: string
  thumbnail?: string | null
  miso_dataset_id?: string
  project_id?: string
}