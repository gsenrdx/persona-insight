-- Add title and description fields to persona_combinations table
ALTER TABLE persona_combinations 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_persona_combinations_title ON persona_combinations(title);

-- Update existing records with default titles based on persona_code
UPDATE persona_combinations 
SET title = CONCAT('페르소나 ', persona_code)
WHERE title IS NULL;