-- 프로젝트 테이블에 새 필드 추가
ALTER TABLE projects 
ADD COLUMN visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
ADD COLUMN join_method TEXT DEFAULT 'open' CHECK (join_method IN ('open', 'invite_only', 'password')),
ADD COLUMN password TEXT;

-- 기존 프로젝트들을 기본값으로 설정
UPDATE projects 
SET visibility = 'public', join_method = 'open' 
WHERE visibility IS NULL OR join_method IS NULL;

-- 프로젝트 멤버십 테이블 생성
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 프로젝트 멤버십 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- 기존 프로젝트의 마스터를 owner로 추가
INSERT INTO project_members (project_id, user_id, role)
SELECT id, master_id, 'owner'
FROM projects
WHERE master_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 트리거 함수: 업데이트 시간 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 프로젝트 멤버십 테이블에 트리거 적용
CREATE TRIGGER update_project_members_updated_at 
BEFORE UPDATE ON project_members 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security 설정
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 프로젝트 멤버십 정책: 자신의 멤버십 정보는 볼 수 있음
CREATE POLICY "Users can view their own project memberships" 
ON project_members FOR SELECT 
USING (auth.uid() = user_id);

-- 프로젝트 멤버십 정책: 같은 프로젝트 멤버끼리는 서로 볼 수 있음
CREATE POLICY "Project members can view other members" 
ON project_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = project_members.project_id 
    AND pm.user_id = auth.uid()
  )
);

-- 프로젝트 멤버십 정책: 프로젝트 오너나 관리자는 멤버 관리 가능
CREATE POLICY "Project owners and admins can manage members" 
ON project_members FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = project_members.project_id 
    AND pm.user_id = auth.uid() 
    AND pm.role IN ('owner', 'admin')
  )
);

-- 댓글: 이 마이그레이션 실행 후 다음 단계들이 필요합니다:
-- 1. 프로젝트 목록 API를 사용자가 소속된 프로젝트만 조회하도록 수정
-- 2. 프로젝트 가입/탈퇴 API 추가
-- 3. 프로젝트 초대 시스템 구현
-- 4. 비밀번호 해싱 및 검증 로직 추가 