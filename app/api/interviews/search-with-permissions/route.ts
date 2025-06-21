import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    const userId = searchParams.get('user_id')
    const personaName = searchParams.get('persona_name')
    
    if (!companyId || !userId || !personaName) {
      return NextResponse.json({ 
        error: 'company_id, user_id, and persona_name are required' 
      }, { status: 400 })
    }

    // Single query to find interview with project permissions
    const { data, error } = await supabase
      .from('interviewees')
      .select(`
        id,
        interviewee_fake_name,
        project_id,
        projects!left (
          id,
          project_members!inner (
            user_id
          )
        ),
        personas!left (
          persona_title,
          persona_type
        )
      `)
      .eq('company_id', companyId)
      .or(`interviewee_fake_name.eq.${personaName},personas.persona_title.eq.${personaName},personas.persona_type.eq.${personaName}`)
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          found: false,
          message: '해당 인터뷰를 찾을 수 없습니다.'
        })
      }
      throw error
    }

    if (!data) {
      return NextResponse.json({ 
        found: false,
        message: '해당 인터뷰를 찾을 수 없습니다.'
      })
    }

    // Check permissions
    if (data.project_id) {
      const hasAccess = data.projects && Array.isArray(data.projects) && data.projects.length > 0 &&
        data.projects[0]?.project_members?.some(
          (member: any) => member.user_id === userId
        )
      
      if (!hasAccess) {
        return NextResponse.json({ 
          found: true,
          hasAccess: false,
          message: '해당 프로젝트에 접근할 권한이 없습니다.'
        })
      }
    }

    return NextResponse.json({
      found: true,
      hasAccess: true,
      interview: {
        id: data.id,
        project_id: data.project_id,
        interviewee_fake_name: data.interviewee_fake_name
      }
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to search interview',
      details: error.message 
    }, { status: 500 })
  }
}