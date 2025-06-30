-- Enable Realtime for interviews and related tables
ALTER PUBLICATION supabase_realtime ADD TABLE interviews;
ALTER PUBLICATION supabase_realtime ADD TABLE interview_notes;

-- Create RLS policies for Realtime access
-- Interviews: Users can see interviews in their company's projects
CREATE POLICY "Users can view interviews in their company projects"
ON interviews FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT p.id 
    FROM projects p
    JOIN profiles prof ON prof.company_id = p.company_id
    WHERE prof.id = auth.uid()
  )
);

-- Interview notes: Users can see notes for interviews they have access to
CREATE POLICY "Users can view notes for accessible interviews"
ON interview_notes FOR SELECT
TO authenticated
USING (
  interview_id IN (
    SELECT i.id 
    FROM interviews i
    JOIN projects p ON p.id = i.project_id
    JOIN profiles prof ON prof.company_id = p.company_id
    WHERE prof.id = auth.uid()
  )
);

-- Users can create notes for interviews they have access to
CREATE POLICY "Users can create notes for accessible interviews"
ON interview_notes FOR INSERT
TO authenticated
WITH CHECK (
  interview_id IN (
    SELECT i.id 
    FROM interviews i
    JOIN projects p ON p.id = i.project_id
    JOIN profiles prof ON prof.company_id = p.company_id
    WHERE prof.id = auth.uid()
  )
  AND user_id = auth.uid()
);

-- Users can update their own notes
CREATE POLICY "Users can update their own notes"
ON interview_notes FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
ON interview_notes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_interviews_project_id ON interviews(project_id);
CREATE INDEX IF NOT EXISTS idx_interviews_processing_status ON interviews(processing_status);
CREATE INDEX IF NOT EXISTS idx_interview_notes_interview_id ON interview_notes(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_notes_user_id ON interview_notes(user_id);

-- Create function to get project interview IDs for filtering
CREATE OR REPLACE FUNCTION get_project_interview_ids(p_project_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM interviews WHERE project_id = p_project_id;
$$;