// 페르소나 데이터 타입 정의
interface PersonaData {
  row_id?: string;
  name?: string;
  persona?: string;
  image?: string;
  keywords?: string;
  persona_keyword?: string;
  insight?: string;
  summary?: string;
  pain_point?: string;
  hidden_needs?: string;
  [key: string]: any;
}

// 특정 ID의 페르소나 데이터 가져오기
export async function fetchPersonaById(id: string) {
  try {
    // 모든 데이터 가져오기 - 절대 URL 사용
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    const response = await fetch(`${baseUrl}/api/sheets`)

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.data || !Array.isArray(result.data)) {
      throw new Error("Invalid data format received from API")
    }

    let item: PersonaData | undefined;

    // 먼저 row_id로 데이터 찾기
    item = result.data.find((persona: PersonaData) => persona.row_id === id)

    // row_id로 찾지 못했고, id가 "persona-" 패턴이면 인덱스로 찾기 시도
    if (!item && id.startsWith("persona-")) {
      const indexStr = id.split("-")[1];
      if (indexStr) {
        const index = parseInt(indexStr, 10) - 1; // 1-based index to 0-based
        if (index >= 0 && index < result.data.length) {
          item = result.data[index];
          // 이 경우, item.row_id가 없을 수 있으므로, 반환되는 id는 요청된 id를 사용하도록 보장
          // (아래 반환 객체에서 id: id, 부분으로 이미 처리됨)
        }
      }
    }

    if (!item) {
      console.error(`Persona with ID ${id} not found`)
      return null
    }

    return {
      id, // 요청된 id를 그대로 사용
      name: item.name || item.persona || '알 수 없는 페르소나',
      image: item.image || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(item.name || item.persona || "페르소나")}`,
      keywords: item.keywords ? item.keywords.split(",").map((k: string) => k.trim()) : 
               item.persona_keyword ? item.persona_keyword.split(",").map((k: string) => k.trim()) : [],
      insight: item.insight || "",
      summary: item.summary || "",
      painPoint: item.pain_point || "",
      hiddenNeeds: item.hidden_needs || "",
    }
  } catch (error) {
    console.error("Error fetching persona by ID:", error)
    return null
  }
}

export async function fetchPersonas(page: number | 'all' = 1, limit = 8) {
  try {
    // 절대 URL 사용
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    const response = await fetch(`${baseUrl}/api/sheets`)

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
    }
    const result = await response.json()

    if (!result.data || !Array.isArray(result.data)) {
      throw new Error("Invalid data format received from API")
    }

    // 'all'이 전달되면 모든 데이터를 반환
    if (page === 'all') {
      return result.data.map((item: PersonaData, index: number) => ({
        id: item.row_id || `persona-${index + 1}`,
        name: item.name || item.persona || `페르소나 ${index + 1}`,
        image: item.image || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(item.persona || "페르소나")}`,
        keywords: item.keywords ? item.keywords.split(",").map((k: string) => k.trim()) : 
                 item.persona_keyword ? item.persona_keyword.split(",").map((k: string) => k.trim()) : [],
        insight: item.insight || "",
        summary: item.summary || "",
        painPoint: item.pain_point || "",
        hiddenNeeds: item.hidden_needs || "",
      }))
    }

    // 페이지네이션 처리
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = result.data.slice(startIndex, endIndex)

    return paginatedData.map((item: PersonaData, index: number) => {
      const personaIndex = startIndex + index
      return {
        id: item.row_id || `persona-${personaIndex + 1}`,
        name: item.name || item.persona || `페르소나 ${personaIndex + 1}`,
        image: item.image || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(item.persona || "페르소나")}`,
        keywords: item.keywords ? item.keywords.split(",").map((k: string) => k.trim()) : 
                 item.persona_keyword ? item.persona_keyword.split(",").map((k: string) => k.trim()) : [],
        insight: item.insight || "",
        summary: item.summary || "",
        painPoint: item.pain_point || "",
        hiddenNeeds: item.hidden_needs || "",
      }
    })
  } catch (error) {
    console.error("Error fetching personas:", error)
    return []
  }
}

export async function fetchKeywords() {
  try {
    // 절대 URL 사용
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    const response = await fetch(`${baseUrl}/api/sheets`)

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
    }
    const result = await response.json()

    if (!result.data || !Array.isArray(result.data)) {
      throw new Error("Invalid data format received from API")
    }

    const keywords = new Set<string>()
    result.data.forEach((item: PersonaData) => {
      if (item.keywords) {
        item.keywords.split(",").forEach((keyword: string) => {
          keywords.add(keyword.trim())
        })
      } else if (item.persona_keyword) {
        item.persona_keyword.split(",").forEach((keyword: string) => {
          keywords.add(keyword.trim())
        })
      }
    })

    return Array.from(keywords)
  } catch (error) {
    console.error("Error fetching keywords:", error)
    return []
  }
}
