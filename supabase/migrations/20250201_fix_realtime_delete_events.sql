-- Set REPLICA IDENTITY to FULL for tables that need DELETE events in Realtime
-- This allows Supabase Realtime to send the old record data on DELETE events

ALTER TABLE interviews REPLICA IDENTITY FULL;
ALTER TABLE interview_notes REPLICA IDENTITY FULL;
ALTER TABLE interview_note_replies REPLICA IDENTITY FULL;

-- Also add DELETE policies for interviews table if not exists
DO $$ 
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'interviews' 
        AND policyname = 'Users can delete their own interviews'
    ) THEN
        CREATE POLICY "Users can delete their own interviews"
        ON interviews FOR DELETE
        TO authenticated
        USING (
          created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = interviews.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'admin')
          )
        );
    END IF;
END $$;