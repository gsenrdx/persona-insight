import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

// GET: 회사의 페르소나 타입 매핑 조회
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

    // 페르소나 타입 매핑 조회 (뷰 사용)
    const { data: mappings, error } = await supabaseAdmin
      .from('persona_type_view')
      .select('*')
      .eq('company_id', companyId)
      .eq('active', true)
      .order('legacy_type')

    if (error) {
      return NextResponse.json(
        { error: '페르소나 타입 매핑 조회 실패' },
        { status: 500 }
      )
    }

    // 새로운 분류 기준 정보도 함께 조회
    const { data: classifications } = await supabaseAdmin
      .from('persona_classifications')
      .select(`
        id,
        name,
        description,
        persona_classification_types (
          id,
          name,
          description
        )
      `)
      .eq('company_id', companyId)
      .order('display_order')

    return NextResponse.json({
      mappings,
      classifications,
      success: true
    })
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// POST: 레거시 페르소나 타입과 새로운 조합 매핑
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

    // 권한 확인
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'company_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { legacyType, combinationId, matrixCellId } = body

    if (!legacyType) {
      return NextResponse.json(
        { error: '레거시 타입이 필요합니다' },
        { status: 400 }
      )
    }

    // 매핑 생성 또는 업데이트
    const { data, error } = await supabaseAdmin
      .from('persona_type_mappings')
      .upsert({
        company_id: companyId,
        legacy_persona_type: legacyType,
        combination_id: combinationId || null,
        matrix_cell_id: matrixCellId || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id,legacy_persona_type'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: '매핑 생성/업데이트 실패' },
        { status: 500 }
      )
    }

    // 해당 타입의 모든 페르소나 업데이트
    if (combinationId) {
      await supabaseAdmin
        .from('personas')
        .update({
          combination_id: combinationId,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId)
        .eq('persona_type', legacyType)
        .eq('active', true)
    }

    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// PUT: 자동 매핑 실행 (레거시 타입을 새로운 시스템으로 마이그레이션)
export async function PUT(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    // 권한 확인
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'company_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    // 자동 매핑 로직
    // 1. 회사의 모든 레거시 타입 조회
    const { data: legacyTypes } = await supabaseAdmin
      .from('personas')
      .select('persona_type')
      .eq('company_id', companyId)
      .eq('active', true)
      .not('persona_type', 'is', null)
      .order('persona_type')

    const uniqueTypes = [...new Set(legacyTypes?.map(p => p.persona_type) || [])]

    // 2. 새로운 조합 조회
    const { data: combinations } = await supabaseAdmin
      .from('persona_combinations')
      .select('*')
      .eq('company_id', companyId)
      .order('persona_code')

    // 3. 자동 매핑 (순서대로 매핑)
    const mappingResults = []
    
    for (let i = 0; i < uniqueTypes.length; i++) {
      const legacyType = uniqueTypes[i]
      const combination = combinations?.[i] // 순서대로 매핑
      
      if (legacyType) {
        const { data, error } = await supabaseAdmin
          .from('persona_type_mappings')
          .upsert({
            company_id: companyId,
            legacy_persona_type: legacyType,
            combination_id: combination?.id || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'company_id,legacy_persona_type'
          })
          .select()
          .single()

        if (!error && data) {
          mappingResults.push(data)
          
          // 페르소나 업데이트
          if (combination?.id) {
            await supabaseAdmin
              .from('personas')
              .update({
                combination_id: combination.id,
                updated_at: new Date().toISOString()
              })
              .eq('company_id', companyId)
              .eq('persona_type', legacyType)
              .eq('active', true)
          }
        }
      }
    }

    return NextResponse.json({
      message: `${mappingResults.length}개의 매핑이 생성/업데이트되었습니다`,
      mappings: mappingResults,
      success: true
    })
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}