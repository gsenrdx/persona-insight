-- Enable Realtime for interview note replies
ALTER PUBLICATION supabase_realtime ADD TABLE interview_note_replies;

-- Create RLS policies for Realtime access
-- Users can see replies for notes they have access to
CREATE POLICY "Users can view replies for accessible notes"
ON interview_note_replies FOR SELECT
TO authenticated
USING (
  note_id IN (
    SELECT n.id 
    FROM interview_notes n
    JOIN interviews i ON i.id = n.interview_id
    JOIN projects p ON p.id = i.project_id
    JOIN profiles prof ON prof.company_id = p.company_id
    WHERE prof.id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_interview_note_replies_note_id ON interview_note_replies(note_id);
CREATE INDEX IF NOT EXISTS idx_interview_note_replies_created_by ON interview_note_replies(created_by);