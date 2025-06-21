import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

// Update persona's MISO dataset ID with proper authorization checks

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { persona_id, miso_dataset_id, user_id } = body


    if (!persona_id) {
      return NextResponse.json({
        error: "persona_id가 필요합니다",
        success: false
      }, { status: 400 })
    }

    if (!user_id) {
      return NextResponse.json({
        error: "사용자 인증이 필요합니다",
        success: false
      }, { status: 401 })
    }

    // 사용자 권한 확인
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, company_id')
      .eq('id', user_id)
      .single()


    if (profileError) {
      return NextResponse.json({
        error: `프로필 조회 오류: ${profileError.message}`,
        success: false
      }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({
        error: "사용자를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    // 페르소나 정보 확인 및 권한 체크
    const { data: persona, error: personaError } = await supabaseAdmin
      .from('personas')
      .select('company_id, project_id')
      .eq('id', persona_id)
      .single()


    if (personaError) {
      return NextResponse.json({
        error: `페르소나 조회 오류: ${personaError.message}`,
        success: false
      }, { status: 500 })
    }

    if (!persona) {
      return NextResponse.json({
        error: "페르소나를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    // 같은 회사인지 확인
    if (persona.company_id !== profile.company_id) {
      return NextResponse.json({
        error: "권한이 없습니다",
        success: false
      }, { status: 403 })
    }

    // 프로젝트별 권한 확인 (프로젝트가 있는 경우)
    if (persona.project_id) {
      const { data: membership } = await supabaseAdmin
        .from('project_members')
        .select('role')
        .eq('project_id', persona.project_id)
        .eq('user_id', user_id)
        .single()

      if (!membership) {
        return NextResponse.json({
          error: "프로젝트 접근 권한이 없습니다",
          success: false
        }, { status: 403 })
      }

      // 프로젝트 관리자 또는 회사 관리자만 수정 가능
      const canEdit = membership.role === 'owner' || membership.role === 'admin' || 
                     profile.role === 'company_admin' || profile.role === 'super_admin'
      
      if (!canEdit) {
        return NextResponse.json({
          error: "수정 권한이 없습니다",
          success: false
        }, { status: 403 })
      }
    } else {
      // 회사별 설정인 경우 회사 관리자만 수정 가능
      const canEdit = profile.role === 'company_admin' || profile.role === 'super_admin'
      
      if (!canEdit) {
        return NextResponse.json({
          error: "수정 권한이 없습니다",
          success: false
        }, { status: 403 })
      }
    }

    // Update dataset ID - treat empty strings as null
    const datasetId = miso_dataset_id && miso_dataset_id.trim() !== '' ? miso_dataset_id.trim() : null

    const { data, error } = await supabaseAdmin
      .from('personas')
      .update({ 
        miso_dataset_id: datasetId,
        updated_at: new Date().toISOString()
      })
      .eq('id', persona_id)
      .select()

    if (error) {
      return NextResponse.json({
        error: "데이터셋 ID 업데이트에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        error: "페르소나를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    return NextResponse.json({
      message: "데이터셋 ID가 성공적으로 업데이트되었습니다",
      persona: data[0],
      success: true
    })
  } catch (error) {
    return NextResponse.json({
      error: "데이터셋 ID 업데이트 중 오류가 발생했습니다",
      success: false
    }, { status: 500 })
  }
}