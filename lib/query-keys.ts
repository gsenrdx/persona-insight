/**
 * 통합 쿼리 키 관리
 * 
 * 일관된 쿼리 키 네이밍으로 캐시 관리 및 무효화를 체계적으로 수행
 */

export const queryKeys = {
  // === Auth 관련 쿼리 키 ===
  auth: {
    all: ['auth'] as const,
    user: () => ['auth', 'user'] as const,
    profile: (userId: string) => ['auth', 'profile', userId] as const,
  },

  // === 프로젝트 관련 쿼리 키 ===
  projects: {
    all: ['projects'] as const,
    lists: () => ['projects', 'list'] as const,
    list: (filters: string) => ['projects', 'list', filters] as const,
    byCompany: (companyId: string) => ['projects', 'company', companyId] as const,
    byUser: (userId: string) => ['projects', 'user', userId] as const,
    byCompanyAndUser: (companyId: string, userId: string) => 
      ['projects', 'company', companyId, 'user', userId] as const,
    details: () => ['projects', 'detail'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    members: () => ['projects', 'members'] as const,
    member: (projectId: string) => ['projects', 'members', projectId] as const,
    insights: (projectId: string) => ['projects', 'insights', projectId] as const,
  },

  // === 페르소나 관련 쿼리 키 ===
  personas: {
    all: ['personas'] as const,
    lists: () => ['personas', 'list'] as const,
    list: (filters: string) => ['personas', 'list', filters] as const,
    byCompany: (companyId: string) => ['personas', 'company', companyId] as const,
    byProject: (projectId: string) => ['personas', 'project', projectId] as const,
    details: () => ['personas', 'detail'] as const,
    detail: (id: string) => ['personas', 'detail', id] as const,
    keywords: (projectId?: string) => 
      projectId ? ['personas', 'keywords', 'project', projectId] as const 
                : ['personas', 'keywords'] as const,
    synthesis: () => ['personas', 'synthesis'] as const,
    synthesisJob: (jobId: string) => ['personas', 'synthesis', 'job', jobId] as const,
  },

  // === 인터뷰 관련 쿼리 키 ===
  interviews: {
    all: ['interviews'] as const,
    lists: () => ['interviews', 'list'] as const,
    list: (filters: string) => ['interviews', 'list', filters] as const,
    byProject: (projectId: string) => ['interviews', 'project', projectId] as const,
    details: () => ['interviews', 'detail'] as const,
    detail: (id: string) => ['interviews', 'detail', id] as const,
    extractionCriteria: (projectId?: string) => 
      projectId ? ['interviews', 'criteria', 'project', projectId] as const
                : ['interviews', 'criteria'] as const,
  },

  // === 워크플로우 관련 쿼리 키 ===
  workflows: {
    all: ['workflows'] as const,
    status: () => ['workflows', 'status'] as const,
    jobs: (jobIds: string[]) => ['workflows', 'jobs', ...jobIds.sort()] as const,
    job: (jobId: string) => ['workflows', 'job', jobId] as const,
  },

  // === 채팅 관련 쿼리 키 ===
  chats: {
    all: ['chats'] as const,
    conversations: () => ['chats', 'conversations'] as const,
    conversation: (conversationId: string) => ['chats', 'conversation', conversationId] as const,
    history: (personaId: string, conversationId?: string) => 
      conversationId ? ['chats', 'history', personaId, conversationId] as const
                     : ['chats', 'history', personaId] as const,
    summary: (conversationId: string) => ['chats', 'summary', conversationId] as const,
  },

  // === 인사이트 관련 쿼리 키 ===
  insights: {
    all: ['insights'] as const,
    byProject: (projectId: string) => ['insights', 'project', projectId] as const,
    trends: (companyId: string) => ['insights', 'trends', 'company', companyId] as const,
    years: (companyId: string) => ['insights', 'years', 'company', companyId] as const,
  },

  // === 회사 관련 쿼리 키 ===
  companies: {
    all: ['companies'] as const,
    detail: (id: string) => ['companies', 'detail', id] as const,
    members: (companyId: string) => ['companies', 'members', companyId] as const,
  },

  // === 파일 관련 쿼리 키 ===
  files: {
    all: ['files'] as const,
    download: (fileId: string) => ['files', 'download', fileId] as const,
    upload: () => ['files', 'upload'] as const,
  },
} as const

/**
 * 쿼리 키 유틸리티 함수들
 */
export const queryKeyUtils = {
  /**
   * 특정 도메인의 모든 쿼리 무효화
   */
  invalidateAll: (domain: keyof typeof queryKeys) => {
    return { queryKey: queryKeys[domain].all }
  },

  /**
   * 특정 프로젝트와 관련된 모든 쿼리 무효화
   */
  invalidateProject: (projectId: string) => {
    return [
      queryKeys.projects.detail(projectId),
      queryKeys.projects.member(projectId),
      queryKeys.projects.insights(projectId),
      queryKeys.personas.byProject(projectId),
      queryKeys.interviews.byProject(projectId),
      queryKeys.insights.byProject(projectId),
    ]
  },

  /**
   * 특정 회사와 관련된 모든 쿼리 무효화
   */
  invalidateCompany: (companyId: string) => {
    return [
      { queryKey: queryKeys.projects.byCompany(companyId) },
      { queryKey: queryKeys.personas.byCompany(companyId) },
      { queryKey: queryKeys.companies.detail(companyId) },
      { queryKey: queryKeys.companies.members(companyId) },
      { queryKey: queryKeys.insights.trends(companyId) },
      { queryKey: queryKeys.insights.years(companyId) },
    ]
  },

  /**
   * 사용자별 쿼리 무효화
   */
  invalidateUser: (userId: string) => {
    return [
      { queryKey: queryKeys.auth.profile(userId) },
      { queryKey: queryKeys.projects.byUser(userId) },
    ]
  },
}

/**
 * 쿼리 키 타입 추출 헬퍼
 */
export type QueryKeys = typeof queryKeys
export type ProjectQueryKeys = typeof queryKeys.projects
export type PersonaQueryKeys = typeof queryKeys.personas