export interface GlossaryTerm {
  id: string
  term: string
  definition: string
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
  creator?: {
    name: string
  }
  updater?: {
    name: string
  }
}

export interface GlossaryFormData {
  term: string
  definition: string
}