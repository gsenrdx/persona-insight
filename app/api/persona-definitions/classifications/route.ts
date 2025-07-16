import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

interface ClassificationType {
  id: string
  name: string
  description: string
}

interface ClassificationCriteria {
  id: string
  name: string
  description: string
  types: ClassificationType[]
}

export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    // 회사의 분류 기준 조회
    const { data: classifications, error } = await supabaseAdmin
      .from('persona_classifications')
      .select('*')
      .eq('company_id', companyId)
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '분류 기준 조회 실패' }, { status: 500 })
    }

    // 각 분류 기준의 유형 조회
    const classificationsWithTypes = await Promise.all(
      (classifications || []).map(async (classification) => {
        const { data: types } = await supabaseAdmin
          .from('persona_classification_types')
          .select('*')
          .eq('classification_id', classification.id)
          .order('display_order', { ascending: true })

        return {
          id: classification.id,
          name: classification.name,
          description: classification.description,
          types: types || []
        }
      })
    )

    // 기존 persona_combinations에서 썸네일, 타이틀, 설명 정보 조회
    const { data: existingCombinations } = await supabaseAdmin
      .from('persona_combinations')
      .select('persona_code, thumbnail, title, description')
      .eq('company_id', companyId)

    // 썸네일, 타이틀, 설명 정보를 매핑 객체로 변환
    const thumbnailMap = (existingCombinations || []).reduce((acc, combination) => {
      acc[combination.persona_code] = combination.thumbnail
      return acc
    }, {} as Record<string, string | null>)

    const titleMap = (existingCombinations || []).reduce((acc, combination) => {
      acc[combination.persona_code] = combination.title || `페르소나 ${combination.persona_code}`
      return acc
    }, {} as Record<string, string>)

    const descriptionMap = (existingCombinations || []).reduce((acc, combination) => {
      acc[combination.persona_code] = combination.description || ''
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({ 
      data: classificationsWithTypes,
      thumbnails: thumbnailMap,
      titles: titleMap,
      descriptions: descriptionMap
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '서버 오류' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)
    
    // 권한 확인 제거 - 모든 사용자가 페르소나 분류 기준을 수정할 수 있음
    // const { data: profile, error: profileError } = await supabaseAdmin
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', userId)
    //   .single()

    // if (profileError || !profile) {
    //   return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다' }, { status: 400 })
    // }

    // // 권한 확인
    // if (profile.role !== 'super_admin' && profile.role !== 'company_admin') {
    //   return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    // }

    const body = await req.json()
    const { classifications, thumbnails = {}, titles = {}, descriptions = {} } = body

    // 트랜잭션 시작
    // 1. 기존 분류 기준 삭제
    const { error: deleteError } = await supabaseAdmin
      .from('persona_classifications')
      .delete()
      .eq('company_id', companyId)

    if (deleteError) {
      return NextResponse.json({ error: '기존 데이터 삭제 실패' }, { status: 500 })
    }

    // 2. 새로운 분류 기준 저장
    for (let i = 0; i < classifications.length; i++) {
      const classification = classifications[i]
      
      // 분류 기준 저장
      const { data: savedClassification, error: classError } = await supabaseAdmin
        .from('persona_classifications')
        .insert({
          company_id: companyId,
          name: classification.name,
          description: classification.description,
          display_order: i
        })
        .select()
        .single()

      if (classError || !savedClassification) {
        return NextResponse.json({ error: '분류 기준 저장 실패' }, { status: 500 })
      }

      // 유형 저장
      for (let j = 0; j < classification.types.length; j++) {
        const type = classification.types[j]
        
        const { error: typeError } = await supabaseAdmin
          .from('persona_classification_types')
          .insert({
            classification_id: savedClassification.id,
            name: type.name,
            description: type.description,
            display_order: j
          })

        if (typeError) {
          return NextResponse.json({ error: '유형 저장 실패' }, { status: 500 })
        }
      }
    }

    // 3. 페르소나 조합 생성
    // 기존 조합 정보 조회 (썸네일, 타이틀, 설명 포함)
    const { data: existingCombinations } = await supabaseAdmin
      .from('persona_combinations')
      .select('id, persona_code, thumbnail, title, description, type_ids')
      .eq('company_id', companyId)
    
    const existingThumbnails: Record<string, string | null> = {}
    const existingTitles: Record<string, string> = {}
    const existingDescriptions: Record<string, string> = {}
    const existingCombinationIds: string[] = []
    
    if (existingCombinations) {
      existingCombinations.forEach(combo => {
        if (combo.thumbnail) {
          existingThumbnails[combo.persona_code] = combo.thumbnail
        }
        if (combo.title) {
          existingTitles[combo.persona_code] = combo.title
        }
        if (combo.description) {
          existingDescriptions[combo.persona_code] = combo.description
        }
        existingCombinationIds.push(combo.id)
      })
      
      // 구조가 변경되면 인터뷰와의 연결 해제
      if (existingCombinations.length > 0) {
        const { error: unlinkError } = await supabaseAdmin
          .from('interviews')
          .update({ persona_combination_id: null })
          .in('persona_combination_id', existingCombinationIds)
        
        if (unlinkError) {
          console.error('Error unlinking interviews:', unlinkError)
          // 계속 진행
        }
      }
    }

    // 저장된 분류 기준과 유형을 다시 조회
    const { data: savedClassifications } = await supabaseAdmin
      .from('persona_classifications')
      .select(`
        id,
        persona_classification_types (
          id,
          display_order
        )
      `)
      .eq('company_id', companyId)
      .order('display_order')

    if (savedClassifications) {
      const combinationData = []
      const newPersonaCodes = []
      let codeIndex = 1

      if (savedClassifications.length === 1) {
        const types = savedClassifications[0].persona_classification_types || []
        for (const type of types) {
          const personaCode = `P${codeIndex}`
          newPersonaCodes.push(personaCode)
          combinationData.push({
            company_id: companyId,
            persona_code: personaCode,
            type_ids: [type.id],
            thumbnail: thumbnails[personaCode] || existingThumbnails[personaCode] || null,
            title: titles[personaCode] || existingTitles[personaCode] || `페르소나 ${personaCode}`,
            description: descriptions[personaCode] || existingDescriptions[personaCode] || ''
          })
          codeIndex++
        }
      } else if (savedClassifications.length === 2) {
        const types1 = savedClassifications[0].persona_classification_types || []
        const types2 = savedClassifications[1].persona_classification_types || []
        
        for (const type1 of types1) {
          for (const type2 of types2) {
            const personaCode = `P${codeIndex}`
            newPersonaCodes.push(personaCode)
            combinationData.push({
              company_id: companyId,
              persona_code: personaCode,
              type_ids: [type1.id, type2.id],
              thumbnail: thumbnails[personaCode] || existingThumbnails[personaCode] || null,
              title: titles[personaCode] || existingTitles[personaCode] || `페르소나 ${personaCode}`,
              description: descriptions[personaCode] || existingDescriptions[personaCode] || ''
            })
            codeIndex++
          }
        }
      }

      // 분류 구조가 변경되었으므로 모든 기존 조합 삭제
      if (existingCombinations && existingCombinations.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from('persona_combinations')
          .delete()
          .eq('company_id', companyId)
        
        if (deleteError) {
          console.error('Error deleting old combinations:', deleteError)
        }
      }

      // 새 조합 추가/업데이트
      if (combinationData.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from('persona_combinations')
          .upsert(combinationData, {
            onConflict: 'company_id,persona_code',
            ignoreDuplicates: false
          })
        
        if (upsertError) {
          console.error('Error upserting combinations:', upsertError)
          return NextResponse.json({ error: '페르소나 조합 저장 실패' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '서버 오류' },
      { status: 500 }
    )
  }
}