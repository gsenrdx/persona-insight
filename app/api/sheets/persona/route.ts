import { NextResponse } from "next/server"

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

export async function GET(request: Request) {
  try {
    // URL에서 id 파라미터 추출
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: "ID 파라미터가 필요합니다" }, { status: 400 })
    }
    
    // 데이터 가져오기
    const data = await fetchGoogleSheetsData()
    
    // 해당 ID의 페르소나 찾기
    const persona = data.find((item: any) => item.row_id === id)
    
    if (!persona) {
      return NextResponse.json({ error: "해당 ID의 페르소나를 찾을 수 없습니다" }, { status: 404 })
    }
    
    // 응답 데이터 포맷팅
    return NextResponse.json({
      persona: {
        id,
        name: persona.name || persona.persona || '알 수 없는 페르소나',
        image: persona.image || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(persona.name || persona.persona || "페르소나")}`,
        keywords: persona.keywords ? persona.keywords.split(",").map((k: string) => k.trim()) : 
                 persona.persona_keyword ? persona.persona_keyword.split(",").map((k: string) => k.trim()) : [],
        insight: persona.insight || "",
        summary: persona.summary || "",
        painPoint: persona.pain_point || "",
        hiddenNeeds: persona.hidden_needs || "",
      }
    })
  } catch (error) {
    console.error("페르소나 데이터 조회 오류:", error)
    return NextResponse.json({ error: "데이터 처리 중 오류가 발생했습니다" }, { status: 500 })
  }
} 