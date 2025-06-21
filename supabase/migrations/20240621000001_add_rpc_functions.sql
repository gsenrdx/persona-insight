-- RPC functions for complex queries to improve performance

-- 1. Check user permissions with single query
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_company_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  has_access BOOLEAN,
  can_edit BOOLEAN,
  user_role TEXT,
  project_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT role, company_id
    FROM profiles
    WHERE id = p_user_id
    LIMIT 1
  ),
  project_member AS (
    SELECT pm.role as project_role
    FROM project_members pm
    WHERE pm.user_id = p_user_id 
      AND pm.project_id = p_project_id
    LIMIT 1
  )
  SELECT 
    CASE 
      WHEN up.company_id = p_company_id THEN TRUE
      ELSE FALSE
    END as has_access,
    CASE
      WHEN p_project_id IS NULL THEN
        -- Company level permission
        up.role IN ('company_admin', 'super_admin')
      ELSE
        -- Project level permission
        COALESCE(pm.project_role IN ('owner', 'admin'), FALSE) OR
        up.role IN ('company_admin', 'super_admin')
    END as can_edit,
    up.role as user_role,
    pm.project_role
  FROM user_profile up
  LEFT JOIN project_member pm ON TRUE;
END;
$$;

-- 2. Get interview with user company verification
CREATE OR REPLACE FUNCTION get_interview_with_access_check(
  p_interview_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  file_path TEXT,
  company_id UUID,
  has_access BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.file_path,
    i.company_id,
    EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = p_user_id 
        AND p.company_id = i.company_id
    ) as has_access
  FROM interviewees i
  WHERE i.id = p_interview_id;
END;
$$;

-- 3. Get project members with profiles (optimized)
CREATE OR REPLACE FUNCTION get_project_members_with_profiles(
  p_project_id UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  project_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  profile_id UUID,
  profile_name TEXT,
  profile_email TEXT,
  profile_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id,
    pm.user_id,
    pm.project_id,
    pm.role,
    pm.joined_at,
    pm.created_at,
    pm.updated_at,
    p.id as profile_id,
    p.name as profile_name,
    au.email as profile_email,
    p.avatar_url as profile_avatar_url
  FROM project_members pm
  JOIN profiles p ON pm.user_id = p.id
  LEFT JOIN auth.users au ON pm.user_id = au.id
  WHERE pm.project_id = p_project_id
  ORDER BY pm.created_at ASC;
END;
$$;

-- 4. Get company members for project
CREATE OR REPLACE FUNCTION get_company_members_for_project(
  p_project_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  role TEXT,
  avatar_url TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.role,
    p.avatar_url,
    p.is_active
  FROM profiles p
  JOIN projects pr ON pr.company_id = p.company_id
  WHERE pr.id = p_project_id
    AND p.is_active = true
  ORDER BY p.name;
END;
$$;

-- 5. Search interview with permissions
CREATE OR REPLACE FUNCTION search_interview_with_permissions(
  p_company_id UUID,
  p_user_id UUID,
  p_persona_name TEXT
)
RETURNS TABLE (
  interview_id UUID,
  project_id UUID,
  interviewee_fake_name TEXT,
  has_access BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_projects AS (
    -- Get all projects user has access to
    SELECT DISTINCT pm.project_id
    FROM project_members pm
    WHERE pm.user_id = p_user_id
    UNION
    -- Include all projects if user is company admin
    SELECT p.id
    FROM projects p
    WHERE p.company_id = p_company_id
      AND EXISTS (
        SELECT 1 FROM profiles pr
        WHERE pr.id = p_user_id
          AND pr.company_id = p_company_id
          AND pr.role IN ('company_admin', 'super_admin')
      )
  )
  SELECT 
    i.id as interview_id,
    i.project_id,
    i.interviewee_fake_name,
    CASE 
      WHEN i.project_id IS NULL THEN true -- Company level interview
      WHEN i.project_id IN (SELECT project_id FROM user_projects) THEN true
      ELSE false
    END as has_access
  FROM interviewees i
  LEFT JOIN personas p ON i.persona_id = p.id
  WHERE i.company_id = p_company_id
    AND (
      i.interviewee_fake_name = p_persona_name
      OR p.persona_title = p_persona_name
      OR p.persona_type = p_persona_name
    )
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_interview_with_access_check TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_members_with_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_members_for_project TO authenticated;
GRANT EXECUTE ON FUNCTION search_interview_with_permissions TO authenticated;