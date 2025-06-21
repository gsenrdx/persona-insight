import { NextResponse } from "next/server"
import { PersonaSearchResult, PersonaSearchInfo } from '@/types/api/personas'

// Search personas using MISO API with Google Sheets data
export const runtime = 'edge'
export const maxDuration = 30

// Fetch persona data from Google Sheets
async function fetchGoogleSheetsData() {
  try {
    // 스프레드시트 ID
    const spreadsheetId = "1sHcnvGAFN7qGQjdfoIqpkfJcRfZM8VE21igRX9BNH2Y"

    // CSV 형식으로 데이터 가져오기
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`,
      { cache: "no-store" } // 항상 최신 데이터 가져오기
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    return parseCSV(csvText)
  } catch (error) {
    throw error
  }
}

// Parse CSV data
function parseCSV(csvText: string) {
  const lines = csvText.split("\n")
  if (lines.length === 0) return []

  // Process headers - convert spaces to underscores
  const headers = lines[0]?.split(",").map((header) => header.trim().toLowerCase().replace(/ /g, "_")) || []

  const result = []

  // 데이터 행 처리
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]?.trim()) continue

    // Parse line handling quoted fields
    const values = parseCSVLine(lines[i] || "")

    // Map headers to values
    const obj: Record<string, string> = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] ? values[index].trim() : ""
    })

    // Only add non-empty objects
    if (Object.values(obj).some((value) => value.trim() !== "")) {
      result.push(obj)
    }
  }

  return result
}

// Parse a single CSV line handling quoted commas
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }

  if (current) {
    result.push(current)
  }

  return result
}

// Handle persona search using MISO API
export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    
    if (!query) {
      return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 })
    }
    
    // Fetch persona data from Google Sheets
    const personas = await fetchGoogleSheetsData()
    
    if (!personas || personas.length === 0) {
      return NextResponse.json({ error: "페르소나 데이터를 찾을 수 없습니다." }, { status: 404 })
    }
    
    // Format persona information
    const personaInfos = personas.map((persona): PersonaSearchInfo => ({
      row_id: persona.row_id,
      name: persona.name,
      summary: persona.summary || "",
      insight: persona.insight || "",
      painPoint: persona.pain_point || "",
      hiddenNeeds: persona.hidden_needs || "",
      keywords: persona.keywords ? persona.keywords.split(",").map((k: string) => k.trim()) : []
    }))
    
    // Call MISO API
    const response = await fetch(
      'https://api.holdings.miso.gs/ext/v1/chat',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer app-2U7Nbl7pPsi3IEgET0HfomvT`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          inputs: {
            selected_mode: "persona_search",
            persona_search_context: JSON.stringify(personaInfos)
          },
          mode: 'blocking',
          conversation_id: '',
          user: 'persona-insight-user',
          files: []
        })
      }
    )
    
    // Handle API errors
    if (!response.ok) {
      await response.text().catch(() => '')
      return NextResponse.json({ error: "페르소나 검색 중 외부 API 오류가 발생했습니다." }, { status: 500 })
    }
    
    // Process MISO API response
    const data = await response.json()
    
    if (!data.answer) {
      return NextResponse.json({ error: "페르소나 검색 결과를 찾을 수 없습니다." }, { status: 404 })
    }
    
    // Parse XML response
    const xmlResult = data.answer
    const recommendedPersonas = parsePersonaSearchResults(xmlResult)
    
    if (recommendedPersonas.length === 0) {
      return NextResponse.json({ error: "적합한 페르소나를 찾을 수 없습니다." }, { status: 404 })
    }
    
    // Enrich parsed personas with detailed information
    const enrichedPersonas = recommendedPersonas.map(persona => {
      const fullPersona = personas.find((p) => p.row_id === persona.personaId)
      
      if (!fullPersona) return persona
      
      return {
        ...persona,
        personaData: {
          ...persona.personaData,
          image: fullPersona.image || "",
          insight: fullPersona.insight || "",
          painPoint: fullPersona.pain_point || "",
          hiddenNeeds: fullPersona.hidden_needs || "",
          keywords: fullPersona.keywords ? fullPersona.keywords.split(",").map((k: string) => k.trim()) : [],
        }
      }
    })
    
    return NextResponse.json({ recommendedPersonas: enrichedPersonas })
    
  } catch (error) {
    return NextResponse.json({ error: "페르소나 검색 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// Parse persona search results from XML format
function parsePersonaSearchResults(xmlText: string): PersonaSearchResult[] {
  try {
    const results: PersonaSearchResult[] = []
    
    // Extract persona_search_results tag
    const resultsMatch = xmlText.match(/<persona_search_results>([\s\S]*?)<\/persona_search_results>/i)
    
    if (!resultsMatch) {
      return []
    }
    
    // Extract each persona tag
    const personasContent = resultsMatch[1]
    const personaMatches = personasContent?.matchAll(/<persona>([\s\S]*?)<\/persona>/gi) || []
    
    // Parse each persona
    for (const match of personaMatches) {
      const personaContent = match[1]
      
      // Extract required fields
      const personaId = extractTagContent(personaContent || "", "persona_id")
      const name = extractTagContent(personaContent || "", "name")
      const summary = extractTagContent(personaContent || "", "summary")
      const relevanceScore = parseInt(extractTagContent(personaContent || "", "relevance_score") || "0", 10)
      const reason = extractTagContent(personaContent || "", "reason")
      
      // Build result object
      results.push({
        personaId,
        personaData: {
          name,
          summary,
        },
        reason,
        relevanceScore
      })
    }
    
    // Sort by relevance score descending
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    
  } catch (error) {
    return []
  }
}

// Extract content from XML tag
function extractTagContent(content: string, tagName: string): string {
  const match = content.match(new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's'))
  return match ? match[1]?.trim() || "" : ""
} 