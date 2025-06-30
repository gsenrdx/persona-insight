-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing select policy if exists
DROP POLICY IF EXISTS "Users can view profiles in same company" ON profiles;

-- Create new policy that allows users to view profiles of users in the same company
CREATE POLICY "Users can view profiles in same company"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Allow users to see their own profile
  id = auth.uid()
  OR
  -- Allow users to see profiles of other users in the same company
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Alternative: Create a more permissive policy for basic profile info
-- This allows viewing name and id for any profile referenced in interviews
DROP POLICY IF EXISTS "Basic profile info visible for interview creators" ON profiles;

CREATE POLICY "Basic profile info visible for interview creators"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Check if the current user can access any interview created by this profile owner
  EXISTS (
    SELECT 1
    FROM interviews i
    JOIN project_members pm ON i.project_id = pm.project_id
    WHERE i.created_by = profiles.id
    AND pm.user_id = auth.uid()
  )
);