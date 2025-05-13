import { NextResponse } from "next/server"
import { createDataStreamResponse } from 'ai'

// Edge Runtime 설정
export const runtime = 'edge'
export const maxDuration = 30

// Google Sheets에서 데이터를 가져오는 함수
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
    console.error("Error fetching Google Sheets data:", error)
    throw error
  }
}

// CSV 파싱 함수
function parseCSV(csvText: string) {
  const lines = csvText.split("\n")
  if (lines.length === 0) return []

  // 헤더 처리 - 공백을 언더스코어로 변환
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase().replace(/ /g, "_"))

  const result = []

  // 데이터 행 처리
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    // 따옴표로 묶인 필드를 처리하는 더 정교한 파싱 로직
    const values = parseCSVLine(lines[i])

    // 헤더와 값을 매핑하여 객체 생성
    const obj: Record<string, string> = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] ? values[index].trim() : ""
    })

    // 빈 객체가 아닌 경우에만 결과에 추가
    if (Object.values(obj).some((value) => value.trim() !== "")) {
      result.push(obj)
    }
  }

  return result
}

// CSV 한 줄을 파싱하는 함수 (따옴표로 묶인 콤마 처리)
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

// Miso API를 사용한 페르소나 검색 처리
export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    
    if (!query) {
      return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 })
    }
    
    // 전달되는 값 콘솔 출력 (디버깅용)
    console.log('[페르소나 검색 요청] query:', query)
    
    // 구글 시트에서 페르소나 데이터 가져오기
    const personas = await fetchGoogleSheetsData()
    
    if (!personas || personas.length === 0) {
      return NextResponse.json({ error: "페르소나 데이터를 찾을 수 없습니다." }, { status: 404 })
    }
    
    // 페르소나 정보 형식 변환
    const personaInfos = personas.map((persona: any) => ({
      row_id: persona.row_id,
      name: persona.name,
      summary: persona.summary || "",
      insight: persona.insight || "",
      painPoint: persona.pain_point || "",
      hiddenNeeds: persona.hidden_needs || "",
      keywords: persona.keywords ? persona.keywords.split(",").map((k: string) => k.trim()) : []
    }))
    
    // Miso API 호출
    const response = await fetch(
      'https://api.holdings.miso.gs/ext/v1/chat',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer app-2U7Nbl7pPsi3IEgET0HfomvT`,  // 테스트용 토큰
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,  // 사용자 검색어
          inputs: {
            selected_mode: "persona_search",
            persona_search_context: JSON.stringify(personaInfos)  // 페르소나 정보를 문자열로 변환
          },
          mode: 'blocking',  // streaming이 아닌 blocking 모드 사용
          conversation_id: '',
          user: 'persona-insight-user',
          files: []
        })
      }
    )
    
    // 오류 처리
    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('⛔ Miso API 오류:', response.status, errorText)
      return NextResponse.json({ error: "페르소나 검색 중 외부 API 오류가 발생했습니다." }, { status: 500 })
    }
    
    // Miso API 응답 처리
    const data = await response.json()
    
    if (!data.answer) {
      return NextResponse.json({ error: "페르소나 검색 결과를 찾을 수 없습니다." }, { status: 404 })
    }
    
    // XML 응답 파싱
    const xmlResult = data.answer
    const recommendedPersonas = parsePersonaSearchResults(xmlResult)
    
    if (recommendedPersonas.length === 0) {
      return NextResponse.json({ error: "적합한 페르소나를 찾을 수 없습니다." }, { status: 404 })
    }
    
    // 파싱된 추천 페르소나에 더 자세한 정보 추가
    const enrichedPersonas = recommendedPersonas.map(persona => {
      const fullPersona = personas.find((p: any) => p.row_id === persona.personaId)
      
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
    console.error("페르소나 검색 오류:", error)
    return NextResponse.json({ error: "페르소나 검색 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// XML 형식의 페르소나 검색 결과 파싱 함수
function parsePersonaSearchResults(xmlText: string): any[] {
  try {
    // 결과 배열 초기화
    const results: any[] = []
    
    // persona_search_results 태그 추출
    const resultsMatch = xmlText.match(/<persona_search_results>([\s\S]*?)<\/persona_search_results>/i)
    
    if (!resultsMatch) {
      console.error("XML 파싱 오류: persona_search_results 태그를 찾을 수 없습니다.")
      return []
    }
    
    // 각 persona 태그 추출
    const personasContent = resultsMatch[1]
    const personaMatches = personasContent.matchAll(/<persona>([\s\S]*?)<\/persona>/gi)
    
    // 각 persona 정보 파싱
    for (const match of personaMatches) {
      const personaContent = match[1]
      
      // 필요한 필드 추출
      const personaId = extractTagContent(personaContent, "persona_id")
      const name = extractTagContent(personaContent, "name")
      const summary = extractTagContent(personaContent, "summary")
      const relevanceScore = parseInt(extractTagContent(personaContent, "relevance_score") || "0", 10)
      const reason = extractTagContent(personaContent, "reason")
      
      // 결과 객체 구성
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
    
    // 관련성 점수 기준 내림차순 정렬
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    
  } catch (error) {
    console.error("XML 파싱 오류:", error)
    return []
  }
}

// XML 태그 내용 추출 헬퍼 함수
function extractTagContent(content: string, tagName: string): string {
  const match = content.match(new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's'))
  return match ? match[1].trim() : ""
} 