import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

interface PersonaInterviewData {
  insights: Array<{
    content: string
    frequency: number
  }>
  painPoints: Array<{
    description: string
    frequency: number
  }>
  needs: Array<{
    description: string
    frequency: number
  }>
}

// 중복 제거 및 빈도 계산 함수
function processItemsWithFrequency<T>(
  items: T[], 
  keyExtractor: (item: T) => string,
  limit: number = 5
): Array<{ description: string; frequency: number }> {
  const frequencyMap = new Map<string, number>()
  
  items.forEach(item => {
    const key = keyExtractor(item)
    if (key && key.trim()) {
      const normalizedKey = key.trim().toLowerCase()
      frequencyMap.set(normalizedKey, (frequencyMap.get(normalizedKey) || 0) + 1)
    }
  })
  
  return Array.from(frequencyMap.entries())
    .map(([description, frequency]) => ({
      description: description.charAt(0).toUpperCase() + description.slice(1), // 첫 글자 대문자
      frequency
    }))
    .sort((a, b) => b.frequency - a.frequency) // 빈도 높은 순으로 정렬
    .slice(0, limit)
}

// 인사이트 처리 함수
function processInsights(interviews: any[]): Array<{ content: string; frequency: number }> {
  const allInsights = interviews.flatMap(i => i.key_takeaways || [])
  
  return processItemsWithFrequency(
    allInsights,
    (insight) => typeof insight === 'string' ? insight : String(insight),
    5
  ).map(item => ({
    content: item.description,
    frequency: item.frequency
  }))
}

// 고민점 처리 함수
function processPainPoints(interviews: any[]): Array<{ description: string; frequency: number }> {
  const allPainPoints = interviews.flatMap(i => i.primary_pain_points || [])
  
  return processItemsWithFrequency(
    allPainPoints,
    (point) => point.description || '',
    5
  )
}

// 니즈 처리 함수
function processNeeds(interviews: any[]): Array<{ description: string; frequency: number }> {
  const allNeeds = interviews.flatMap(i => i.primary_needs || [])
  
  return processItemsWithFrequency(
    allNeeds,
    (need) => need.description || '',
    5
  )
}

// 인터뷰 데이터 조회 함수 (개선된 로직)
async function getPersonaInterviewData(personaId: string, companyId: string): Promise<PersonaInterviewData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: { fetch: fetch },
    realtime: { disabled: true }
  })

  try {
    const { data: interviews, error: interviewError } = await supabase
      .from('interviews')
      .select(`
        id,
        primary_pain_points,
        primary_needs,
        key_takeaways,
        summary,
        interviewee_profile,
        cleaned_script
      `)
      .eq('persona_combination_id', personaId)
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .limit(15)

    if (!interviews || interviews.length === 0) {
      return null
    }

    // 개선된 데이터 처리 로직 사용
    const insights = processInsights(interviews)
    const painPoints = processPainPoints(interviews)
    const needs = processNeeds(interviews)

    return {
      insights,
      painPoints,
      needs
    }

  } catch (error) {
    return null
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personaId } = await params
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!personaId || !companyId) {
      return NextResponse.json(
        { error: 'personaId와 companyId가 필요합니다.' },
        { status: 400 }
      )
    }

    const interviewData = await getPersonaInterviewData(personaId, companyId)

    if (!interviewData) {
      return NextResponse.json({
        insights: [{ content: '이 페르소나의 구체적인 인사이트는 지속적으로 업데이트됩니다.', frequency: 1 }],
        painPoints: [{ description: '이 페르소나의 고민점은 인터뷰를 통해 파악됩니다.', frequency: 1 }],
        needs: [{ description: '이 페르소나의 니즈는 인터뷰를 통해 파악됩니다.', frequency: 1 }]
      })
    }

    return NextResponse.json(interviewData)

  } catch (error) {
    return NextResponse.json(
      { error: '인터뷰 데이터를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}