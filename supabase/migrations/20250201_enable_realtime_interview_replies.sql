-- Enable Realtime for interview_note_replies table
ALTER PUBLICATION supabase_realtime ADD TABLE interview_note_replies;

-- Ensure RLS is enabled on interview_note_replies
ALTER TABLE interview_note_replies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for interview_note_replies if not exists
DO $$ 
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'interview_note_replies' 
        AND policyname = 'Users can view replies for accessible notes'
    ) THEN
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
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'interview_note_replies' 
        AND policyname = 'Users can create replies for accessible notes'
    ) THEN
        CREATE POLICY "Users can create replies for accessible notes"
        ON interview_note_replies FOR INSERT
        TO authenticated
        WITH CHECK (
          note_id IN (
            SELECT n.id 
            FROM interview_notes n
            JOIN interviews i ON i.id = n.interview_id
            JOIN projects p ON p.id = i.project_id
            JOIN profiles prof ON prof.company_id = p.company_id
            WHERE prof.id = auth.uid()
          )
          AND created_by = auth.uid()
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'interview_note_replies' 
        AND policyname = 'Users can update their own replies'
    ) THEN
        CREATE POLICY "Users can update their own replies"
        ON interview_note_replies FOR UPDATE
        TO authenticated
        USING (created_by = auth.uid())
        WITH CHECK (created_by = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'interview_note_replies' 
        AND policyname = 'Users can delete their own replies'
    ) THEN
        CREATE POLICY "Users can delete their own replies"
        ON interview_note_replies FOR DELETE
        TO authenticated
        USING (created_by = auth.uid());
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_interview_note_replies_note_id ON interview_note_replies(note_id);
CREATE INDEX IF NOT EXISTS idx_interview_note_replies_created_by ON interview_note_replies(created_by);