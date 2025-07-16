import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

interface ClassificationInfo {
  classificationName: string
  classificationDescription: string
  typeName: string
  typeDescription: string
  typeId: string
}

async function getPersonaClassificationInfo(personaId: string, companyId: string): Promise<ClassificationInfo[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: { fetch: fetch },
    realtime: { disabled: true }
  })

  try {
    // 1. 페르소나 조합 정보 가져오기
    const { data: persona, error: personaError } = await supabase
      .from('persona_combinations')
      .select('id, type_ids, persona_code, title')
      .eq('id', personaId)
      .eq('company_id', companyId)
      .single()

    if (personaError || !persona) {
      return []
    }

    // 2. 분류 타입 정보 가져오기
    const { data: classificationTypes, error: typesError } = await supabase
      .from('persona_classification_types')
      .select(`
        id,
        name,
        description,
        display_order,
        persona_classifications!inner (
          id,
          name,
          description,
          display_order
        )
      `)
      .in('id', persona.type_ids)

    if (typesError || !classificationTypes) {
      return []
    }

    // 3. 분류 정보 구성
    const classificationInfo: ClassificationInfo[] = classificationTypes.map(type => ({
      classificationName: type.persona_classifications.name,
      classificationDescription: type.persona_classifications.description,
      typeName: type.name,
      typeDescription: type.description,
      typeId: type.id
    }))
    
    // 분류 순서대로 정렬
    classificationInfo.sort((a, b) => {
      // 충전 패턴이 먼저 나오도록
      if (a.classificationName === '충전 패턴' && b.classificationName !== '충전 패턴') return -1
      if (a.classificationName !== '충전 패턴' && b.classificationName === '충전 패턴') return 1
      return 0
    })

    return classificationInfo

  } catch (error) {
    return []
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

    const classificationInfo = await getPersonaClassificationInfo(personaId, companyId)

    return NextResponse.json(classificationInfo)

  } catch (error) {
    return NextResponse.json(
      { error: '분류 정보를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}