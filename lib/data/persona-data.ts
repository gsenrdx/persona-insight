import { PersonaData } from "@/types/persona"
import { getPersonaTypeInfo } from "@/lib/utils/persona"

/**
 * 회사 단위로 페르소나 목록 조회
 */
export async function fetchPersonas(company_id?: string): Promise<PersonaCardData[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    )
    
    if (!company_id) {
      return []
    }

    const url = `${baseUrl}/api/personas?company_id=${company_id}`

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 400) {
        const errorData = await response.json()
        throw new Error(`Failed to fetch personas: ${errorData.error || 'Bad Request'}`)
      }
      throw new Error(`Failed to fetch personas: ${response.status} ${response.statusText}`)
    }

    const { data, success, error } = await response.json()

    if (!success) {
      throw new Error(error || "Failed to fetch personas")
    }

    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid persona data format received from API")
    }

    // persona_type으로 정렬
    return data
      .map((persona: PersonaData) => {
        getPersonaTypeInfo(persona.persona_type)
        
        return {
          id: persona.id,
          name: persona.persona_title || persona.persona_description,
          image: persona.thumbnail || `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(persona.persona_title || persona.persona_description)}`,
          keywords: [],
          insight: persona.insight,
          summary: persona.persona_description,
          painPoint: persona.painpoints,
          hiddenNeeds: persona.needs,
          persona_character: persona.persona_style,
          persona_type: persona.persona_type,
          persona_description: persona.persona_description,
          persona_title: persona.persona_title,
          persona_summary: persona.persona_summary,
          persona_style: persona.persona_style,
          painpoints: persona.painpoints,
          needs: persona.needs,
          insight_quote: persona.insight_quote
        }
      })
      .sort((a, b) => {
        return a.persona_type.localeCompare(b.persona_type)
      })
  } catch (error) {
    throw error
  }
}

/**
 * ID로 특정 페르소나 조회
 */
export async function fetchPersonaById(id: string, company_id?: string, project_id?: string): Promise<PersonaCardData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    )
    
    if (!company_id) {
      return null
    }
    
    let url = `${baseUrl}/api/personas?company_id=${company_id}`
    if (project_id) {
      url += `&project_id=${project_id}`
    }
    
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch personas: ${response.status} ${response.statusText}`)
    }

    const { data, success, error } = await response.json()

    if (!success) {
      throw new Error(error || "Failed to fetch personas")
    }

    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid persona data format received from API")
    }

    const persona = data.find((p: PersonaData) => p.id === id)
    
    if (!persona) {
      return null
    }

    getPersonaTypeInfo(persona.persona_type)
    
    return {
      id: persona.id,
      name: persona.persona_title || persona.persona_description,
      image: persona.thumbnail || `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(persona.persona_title || persona.persona_description)}`,
      keywords: [],
      insight: persona.insight,
      summary: persona.persona_description,
      painPoint: persona.painpoints,
      hiddenNeeds: persona.needs,
      persona_character: persona.persona_style,
      persona_type: persona.persona_type,
      persona_description: persona.persona_description,
      persona_title: persona.persona_title,
      persona_summary: persona.persona_summary,
      persona_style: persona.persona_style,
      painpoints: persona.painpoints,
      needs: persona.needs,
      insight_quote: persona.insight_quote
    }
  } catch (error) {
    return null
  }
}

// 키워드 기능 (비활성화)
export async function fetchKeywords(): Promise<string[]> {
  try {
    return []
  } catch (error) {
    return []
  }
}

/**
 * UI 컴포넌트용 페르소나 데이터 타입
 */
export interface PersonaCardData {
  id: string
  name: string
  image: string
  keywords: string[]
  insight: string
  summary: string
  painPoint: string
  hiddenNeeds: string
  persona_character: string
  persona_type: string
  persona_description: string
  // Chat API용 추가 필드
  persona_title?: string | null
  persona_summary?: string | null
  persona_style?: string | null
  painpoints?: string | null
  needs?: string | null
  insight_quote?: string | null
} 