import { PersonaData, PersonaApiResponse, getPersonaTypeInfo } from "@/types/persona"

// 모든 페르소나 가져오기
export async function fetchPersonas(company_id?: string, project_id?: string): Promise<PersonaCardData[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    )
    
    if (!company_id) {
      console.warn("fetchPersonas 호출 시 company_id가 제공되지 않았습니다.")
      return []
    }

    let url = `${baseUrl}/api/supabase/persona?company_id=${company_id}`
    if (project_id) {
      url += `&project_id=${project_id}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      // 400 Bad Request와 같은 클라이언트 오류도 처리
      if (response.status === 400) {
        const errorData = await response.json()
        throw new Error(`Failed to fetch personas: ${errorData.error || 'Bad Request'}`)
      }
      throw new Error(`Failed to fetch personas: ${response.status} ${response.statusText}`)
    }

    const result: PersonaApiResponse = await response.json()

    if (!result.data || !Array.isArray(result.data)) {
      throw new Error("Invalid persona data format received from API")
    }

    // Supabase 데이터를 UI 컴포넌트 형식으로 변환
    return result.data.map((persona: PersonaData) => {
      const typeInfo = getPersonaTypeInfo(persona.persona_type)
      
      return {
        id: persona.id,
        name: persona.persona_description, // persona_description을 name으로 사용
        image: persona.thumbnail || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(persona.persona_description)}`,
        keywords: [], // 키워드 비우기
        insight: persona.insight_quote,
        summary: persona.persona_summary,
        painPoint: persona.painpoints,
        hiddenNeeds: persona.needs,
        persona_character: persona.persona_style,
        persona_type: persona.persona_type,
        persona_description: persona.persona_description
      }
    })
  } catch (error) {
    console.error("Error fetching personas:", error)
    throw error
  }
}

// 특정 ID의 페르소나 가져오기
export async function fetchPersonaById(id: string, company_id?: string, project_id?: string): Promise<PersonaCardData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    )
    
    if (!company_id) {
      console.warn("fetchPersonaById 호출 시 company_id가 제공되지 않았습니다.")
      return null
    }
    
    let url = `${baseUrl}/api/supabase/persona?company_id=${company_id}`
    if (project_id) {
      url += `&project_id=${project_id}`
    }
    
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch personas: ${response.status} ${response.statusText}`)
    }

    const result: PersonaApiResponse = await response.json()

    if (!result.data || !Array.isArray(result.data)) {
      throw new Error("Invalid persona data format received from API")
    }

    // 특정 ID의 페르소나 찾기
    const persona = result.data.find((p: PersonaData) => p.id === id)
    
    if (!persona) {
      console.error(`Persona with ID ${id} not found`)
      return null
    }

    const typeInfo = getPersonaTypeInfo(persona.persona_type)
    
    return {
      id: persona.id,
      name: persona.persona_description,
      image: persona.thumbnail || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(persona.persona_description)}`,
      keywords: [],
      insight: persona.insight_quote,
      summary: persona.persona_summary,
      painPoint: persona.painpoints,
      hiddenNeeds: persona.needs,
      persona_character: persona.persona_style,
      persona_type: persona.persona_type,
      persona_description: persona.persona_description
    }
  } catch (error) {
    console.error("Error fetching persona by ID:", error)
    return null
  }
}

// 키워드 추출 함수 (페르소나 데이터에서 키워드 생성)
function extractKeywordsFromPersona(persona: PersonaData): string[] {
  const keywords: string[] = []
  
  // 페르소나 타입 기반 키워드
  const typeInfo = getPersonaTypeInfo(persona.persona_type)
  keywords.push(typeInfo.subtitle.split(' / ')[0]) // Home-centric or Road-centric
  keywords.push(typeInfo.subtitle.split(' / ')[1]) // Cost-driven or Tech/Brand-driven
  
  // 페인포인트에서 키워드 추출 (처음 3개 단어)
  const painpointWords = persona.painpoints
    .split(',')[0] // 첫 번째 페인포인트만
    .trim()
    .split(' ')
    .slice(0, 2) // 처음 2개 단어만
    .filter(word => word.length > 1)
  
  keywords.push(...painpointWords)
  
  // 니즈에서 키워드 추출
  const needsWords = persona.needs
    .split(',')[0] // 첫 번째 니즈만
    .trim()
    .split(' ')
    .slice(0, 2) // 처음 2개 단어만
    .filter(word => word.length > 1)
  
  keywords.push(...needsWords)
  
  // 중복 제거 및 최대 6개까지
  return [...new Set(keywords)].slice(0, 6)
}

// 모든 키워드 가져오기 (현재 비활성화)
export async function fetchKeywords(): Promise<string[]> {
  try {
    // 키워드 기능 비활성화
    return []
  } catch (error) {
    console.error("Error fetching keywords:", error)
    return []
  }
}

// UI 컴포넌트에서 사용할 데이터 타입
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
} 