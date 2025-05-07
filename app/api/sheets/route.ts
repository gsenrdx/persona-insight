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

export async function GET() {
  try {
    const data = await fetchGoogleSheetsData()
    return NextResponse.json({ data })
  } catch (error) {
    console.error("API route error:", error)
    return NextResponse.json({ error: "Failed to fetch data from Google Sheets" }, { status: 500 })
  }
}
