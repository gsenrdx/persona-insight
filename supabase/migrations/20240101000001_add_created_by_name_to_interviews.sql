-- Add created_by_name column to interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Update existing interviews with creator names
UPDATE interviews i
SET created_by_name = p.name
FROM profiles p
WHERE i.created_by = p.id
AND i.created_by_name IS NULL;

-- Create a function to automatically set created_by_name on insert
CREATE OR REPLACE FUNCTION set_interview_created_by_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the name from profiles table
  SELECT name INTO NEW.created_by_name
  FROM profiles
  WHERE id = NEW.created_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set created_by_name
DROP TRIGGER IF EXISTS set_interview_created_by_name_trigger ON interviews;
CREATE TRIGGER set_interview_created_by_name_trigger
  BEFORE INSERT ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION set_interview_created_by_name();