-- 성능 최적화를 위한 데이터베이스 인덱스 추가
-- 실행 날짜: 2024-06-20

-- ============================================
-- 1. personas 테이블 인덱스
-- ============================================

-- 회사별 프로젝트별 페르소나 조회 최적화
CREATE INDEX IF NOT EXISTS idx_personas_company_project 
ON personas(company_id, project_id) 
WHERE active = true;

-- 활성 페르소나 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_personas_active 
ON personas(active) 
WHERE active = true;

-- 페르소나 타입별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_personas_type_company 
ON personas(persona_type, company_id) 
WHERE active = true;

-- 생성일 기준 정렬 최적화
CREATE INDEX IF NOT EXISTS idx_personas_created_at 
ON personas(created_at DESC);

-- ============================================
-- 2. interviewees 테이블 인덱스
-- ============================================

-- 회사별 프로젝트별 인터뷰 조회 최적화
CREATE INDEX IF NOT EXISTS idx_interviewees_company_project 
ON interviewees(company_id, project_id);

-- 세션 날짜별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_interviewees_session_date 
ON interviewees(session_date DESC);

-- 생성자별 조회 최적화 (N+1 쿼리 방지)
CREATE INDEX IF NOT EXISTS idx_interviewees_created_by 
ON interviewees(created_by);

-- 복합 인덱스: 회사 + 날짜 (insights API 최적화)
CREATE INDEX IF NOT EXISTS idx_interviewees_company_date 
ON interviewees(company_id, session_date DESC);

-- ============================================
-- 3. main_topics 테이블 인덱스
-- ============================================

-- 회사별 토픽 조회 최적화
CREATE INDEX IF NOT EXISTS idx_main_topics_company 
ON main_topics(company_id);

-- 토픽명 + 회사 복합 인덱스 (중복 체크 최적화)
CREATE INDEX IF NOT EXISTS idx_main_topics_name_company 
ON main_topics(topic_name, company_id);

-- ============================================
-- 4. projects 테이블 인덱스
-- ============================================

-- 회사별 프로젝트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_projects_company 
ON projects(company_id);

-- 활성 프로젝트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_projects_company_active 
ON projects(company_id) 
WHERE deleted_at IS NULL;

-- ============================================
-- 5. project_members 테이블 인덱스
-- ============================================

-- 프로젝트별 멤버 조회 최적화
CREATE INDEX IF NOT EXISTS idx_project_members_project 
ON project_members(project_id);

-- 사용자별 프로젝트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_project_members_user 
ON project_members(user_id);

-- 복합 인덱스: 프로젝트 + 사용자 (중복 체크)
CREATE INDEX IF NOT EXISTS idx_project_members_project_user 
ON project_members(project_id, user_id);

-- ============================================
-- 6. profiles 테이블 인덱스
-- ============================================

-- 회사별 프로필 조회 최적화
CREATE INDEX IF NOT EXISTS idx_profiles_company 
ON profiles(company_id);

-- 이메일 조회 최적화
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

-- ============================================
-- 7. companies 테이블 인덱스
-- ============================================

-- 회사명 조회 최적화
CREATE INDEX IF NOT EXISTS idx_companies_name 
ON companies(name);

-- ============================================
-- 8. 통계 정보 업데이트
-- ============================================

-- 인덱스 생성 후 통계 정보 업데이트
ANALYZE personas;
ANALYZE interviewees;
ANALYZE main_topics;
ANALYZE projects;
ANALYZE project_members;
ANALYZE profiles;
ANALYZE companies;

-- ============================================
-- 인덱스 생성 확인 쿼리
-- ============================================
/*
-- 생성된 인덱스 확인
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('personas', 'interviewees', 'main_topics', 'projects', 'project_members', 'profiles', 'companies')
ORDER BY tablename, indexname;

-- 테이블별 인덱스 사용량 확인
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
*/