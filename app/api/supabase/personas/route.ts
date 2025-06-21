import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Get personas with filtering by company, active status, and project

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const company_id = searchParams.get('company_id')
    const active = searchParams.get('active')
    const project_id = searchParams.get('project_id')

    if (!company_id) {
      return NextResponse.json({
        error: 'company_id가 필요합니다',
        success: false
      }, { status: 400 })
    }

    let query = supabase
      .from('personas')
      .select('*')
      .eq('company_id', company_id)

    // Apply active filter
    if (active === 'true') {
      query = query.eq('active', true)
    } else if (active === 'false') {
      query = query.eq('active', false)
    }

    // Apply project filter
    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data: personas, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({
        error: '페르소나 조회에 실패했습니다',
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: personas || []
    })

  } catch (error: any) {
    return NextResponse.json({
      error: '페르소나 조회 중 오류가 발생했습니다',
      details: error.message,
      success: false
    }, { status: 500 })
  }
}