// Types for persona-related API responses
import { Database } from '../database'

type Persona = Database['public']['Tables']['personas']['Row']

// Persona search result from MISO API
export interface PersonaSearchResult {
  row_id: string
  personaId: string
  name: string
  score: number
}

// Full persona info for search
export interface PersonaSearchInfo {
  row_id: string
  persona_title: string | null
  persona_type: string
  persona_style: string
  persona_summary: string
  needs: string
  painpoints: string
  insight: string
  insight_quote: string
}