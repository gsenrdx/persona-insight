import { NextResponse } from "next/server"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

// Google Sheets에서 데이터를 가져오는 함수
async function fetchGoogleSheetsData() {
  try {
    // 스프레드시트 ID
    const spreadsheetId = "1sHcnvGAFN7qGQjdfoIqpkfJcRfZM8VE21igRX9BNH2Y"

    // CSV 형식으로 데이터 가져오기
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`,
      { cache: "no-store" }, // 항상 최신 데이터 가져오기
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

export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    
    if (!query) {
      return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 })
    }
    
    // 구글 시트에서 페르소나 데이터 가져오기
    const personas = await fetchGoogleSheetsData()
    
    if (!personas || personas.length === 0) {
      return NextResponse.json({ error: "페르소나 데이터를 찾을 수 없습니다." }, { status: 404 })
    }
    
    // GPT를 사용하여 가장 적합한 페르소나 찾기
    const personaInfos = personas.map((persona: any) => ({
      row_id: persona.row_id,
      name: persona.name,
      summary: persona.summary || "",
      insight: persona.insight || "",
      painPoint: persona.pain_point || "",
      hiddenNeeds: persona.hidden_needs || "",
      keywords: persona.keywords ? persona.keywords.split(",").map((k: string) => k.trim()) : []
    }))
    
    // OpenAI 요청 수행
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `당신은 사용자의 검색 쿼리를 분석하여 적합한 페르소나를 찾아주는 AI 어시스턴트입니다. 
            제공된 페르소나 목록에서 사용자의 요구와 가장 잘 맞는 페르소나 3-5개를 선택해주세요.
            응답은 반드시 다음 JSON 형식이어야 합니다:
            { 
              "personas": [
                { "personaId": "첫번째_persona_row_id", "reason": "이 페르소나를 선택한 간단한 이유", "relevanceScore": 90 },
                { "personaId": "두번째_persona_row_id", "reason": "이 페르소나를 선택한 간단한 이유", "relevanceScore": 85 },
                ...
              ]
            }
            relevanceScore는 검색 쿼리와의 관련성 점수로 0-100 사이의 값을 제공해주세요.
            가장 관련성이 높은 페르소나부터 내림차순으로 정렬하여 반환하세요.`
          },
          {
            role: "user",
            content: `사용자 검색 쿼리: "${query}"\n\n사용 가능한 페르소나 목록:\n${JSON.stringify(personaInfos, null, 2)}\n\n적합한 페르소나들의 row_id와 선택 이유를 JSON 형식으로 반환해주세요.`
          }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status} ${response.statusText}`)
    }
    
    const openaiResponse = await response.json()
    const responseContent = openaiResponse.choices[0].message.content
    const gptResponse = JSON.parse(responseContent)
    
    // 선택된 페르소나들 정보 가져오기
    const recommendedPersonas = gptResponse.personas.map((recommendation: any) => {
      const persona = personas.find((p: any) => p.row_id === recommendation.personaId)
      
      if (!persona) return null
      
      return {
        personaId: persona.row_id,
        personaData: {
          name: persona.name,
          image: persona.image || "",
          summary: persona.summary || "",
          insight: persona.insight || "",
          painPoint: persona.pain_point || "",
          hiddenNeeds: persona.hidden_needs || "",
          keywords: persona.keywords ? persona.keywords.split(",").map((k: string) => k.trim()) : [],
        },
        reason: recommendation.reason,
        relevanceScore: recommendation.relevanceScore
      }
    }).filter(Boolean)
    
    if (recommendedPersonas.length === 0) {
      return NextResponse.json({ error: "적합한 페르소나를 찾을 수 없습니다." }, { status: 404 })
    }
    
    return NextResponse.json({
      recommendedPersonas
    })
  } catch (error) {
    console.error("AI 페르소나 검색 오류:", error)
    return NextResponse.json({ error: "페르소나 검색 중 오류가 발생했습니다." }, { status: 500 })
  }
} 