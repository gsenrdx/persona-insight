import { supabaseAdmin } from '@/lib/supabase-server'
import { TransformedProject, CreateProjectParams } from './types'

export class ProjectsService {
  /**
   * Get projects for a user in a company
   * Returns public projects + private projects where user is a member
   */
  static async getUserProjects(
    companyId: string,
    userId: string
  ): Promise<TransformedProject[]> {
    // Try RPC function first (optimized query)
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc('get_projects_with_members', {
        p_company_id: companyId,
        p_user_id: userId
      })

    if (!rpcError && rpcData) {
      // Transform RPC results to frontend format
      return rpcData.map((project): TransformedProject => ({
        id: project.project_id,
        name: project.project_name,
        description: project.project_description,
        visibility: project.project_visibility,
        join_method: project.project_join_method,
        created_at: project.project_created_at,
        created_by: project.project_created_by,
        company_id: companyId,
        is_active: true,
        member_count: Number(project.member_count) || 0,
        interview_count: Number(project.interview_count) || 0,
        persona_count: Number(project.persona_count) || 0,
        top_members: project.top_members || [],
        membership: project.user_membership || null
      }))
    }

    // Fallback to separate queries if RPC fails
    const [publicProjects, privateProjects] = await Promise.all([
      // Public projects
      supabaseAdmin
        .from('projects')
        .select(`
          *,
          project_members(id, role, joined_at, user_id),
          interviewees(count),
          personas!left(count)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('visibility', 'public')
        .eq('personas.active', true),
      
      // Private projects where user is member
      supabaseAdmin
        .from('projects')
        .select(`
          *,
          project_members!inner(id, role, joined_at, user_id),
          interviewees(count),
          personas!left(count)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('visibility', 'private')
        .eq('project_members.user_id', userId)
        .eq('personas.active', true)
    ])

    const combinedData = [
      ...(publicProjects.data || []),
      ...(privateProjects.data || [])
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const combinedError = publicProjects.error || privateProjects.error
    
    if (combinedError) {
      // Final fallback: basic query without membership info
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          project_members(count),
          interviewees(count),
          personas(count)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fallbackError) {
        throw new Error('프로젝트 데이터를 가져오는데 실패했습니다')
      }

      // Transform fallback data
      return (fallbackData || []).map((project) => ({
        ...project,
        member_count: project.project_members?.[0]?.count || 0,
        interview_count: project.interviewees?.[0]?.count || 0,
        persona_count: project.personas?.[0]?.count || 0,
        top_members: [],
        membership: null,
        project_members: undefined,
        interviewees: undefined,
        personas: undefined
      }))
    }

    // Transform combined data
    return combinedData.map((project) => {
      const membership = project.project_members?.find((pm) => pm.user_id === userId)
      const memberCount = project.project_members?.length || 0
      const interviewCount = project.interviewees?.[0]?.count || 0
      const personaCount = project.personas?.[0]?.count || 0
      
      return {
        ...project,
        membership,
        member_count: memberCount,
        interview_count: interviewCount,
        persona_count: personaCount,
        top_members: [],
        project_members: undefined,
        interviewees: undefined,
        personas: undefined
      }
    })
  }

  /**
   * Create a new project
   */
  static async createProject(params: CreateProjectParams): Promise<any> {
    const {
      name,
      description = '',
      visibility = 'public',
      join_method = 'open',
      password,
      user_id,
      company_id,
      purpose,
      target_audience,
      research_method,
      start_date,
      end_date
    } = params

    // Verify user profile and permissions
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, company_id')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      throw new Error('사용자 정보를 찾을 수 없습니다')
    }

    // Verify company membership
    if (profile.company_id !== company_id) {
      throw new Error('해당 회사의 멤버가 아닙니다')
    }

    // Create project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description,
        visibility,
        join_method,
        password: join_method === 'password' ? password : null,
        created_by: user_id,
        company_id,
        purpose: purpose || null,
        target_audience: target_audience || null,
        research_method: research_method || null,
        start_date: start_date || null,
        end_date: end_date || null,
        is_active: true
      })
      .select()
      .single()

    if (projectError) {
      throw new Error('프로젝트 생성에 실패했습니다')
    }

    // Add creator as project owner
    const { error: memberError } = await supabaseAdmin
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user_id,
        role: 'owner',
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      // Log warning but don't fail the whole operation
      // Project member addition failed, but continuing
    }

    return project
  }
}