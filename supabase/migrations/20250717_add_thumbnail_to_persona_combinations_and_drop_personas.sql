-- Add thumbnail field to persona_combinations table and remove legacy personas table
-- Migration: 20250717_add_thumbnail_to_persona_combinations_and_drop_personas

-- Add thumbnail field to persona_combinations table
ALTER TABLE persona_combinations 
ADD COLUMN thumbnail TEXT;

-- Add comment to describe the new field
COMMENT ON COLUMN persona_combinations.thumbnail IS 'URL or path to the persona combination thumbnail image';

-- Drop the legacy personas table 
-- Note: This table is no longer used as the app now uses persona_combinations
DROP TABLE IF EXISTS personas CASCADE;

-- Update any views or functions that might reference the old table
-- (Add specific updates here if needed)

-- Create index for thumbnail field for better performance if needed
-- CREATE INDEX IF NOT EXISTS idx_persona_combinations_thumbnail ON persona_combinations(thumbnail) WHERE thumbnail IS NOT NULL;