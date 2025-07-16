-- Add performance indexes for frequently queried columns

-- Interviewees table indexes
CREATE INDEX IF NOT EXISTS idx_interviewees_company_project 
ON interviewees(company_id, project_id) 
WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interviewees_company_session_date 
ON interviewees(company_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_interviewees_persona_reflected 
ON interviewees(persona_id) 
WHERE persona_reflected = true;

-- Personas table indexes
CREATE INDEX IF NOT EXISTS idx_personas_company_active 
ON personas(company_id, active) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_personas_project_active 
ON personas(project_id, active) 
WHERE project_id IS NOT NULL AND active = true;

CREATE INDEX IF NOT EXISTS idx_personas_type_company 
ON personas(persona_type, company_id) 
WHERE active = true;

-- Project members table indexes
CREATE INDEX IF NOT EXISTS idx_project_members_user_project 
ON project_members(user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_project_role 
ON project_members(project_id, role);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company_active 
ON profiles(company_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_profiles_company_role 
ON profiles(company_id, role) 
WHERE is_active = true;

-- Main topics table indexes
CREATE INDEX IF NOT EXISTS idx_main_topics_company_name 
ON main_topics(company_id, topic_name);

CREATE INDEX IF NOT EXISTS idx_main_topics_project 
ON main_topics(project_id) 
WHERE project_id IS NOT NULL;

-- Persona topic documents table indexes
CREATE INDEX IF NOT EXISTS idx_persona_topic_docs_persona 
ON persona_topic_documents(persona_id);

CREATE INDEX IF NOT EXISTS idx_persona_topic_docs_topic 
ON persona_topic_documents(topic_id);

-- Persona classifications table indexes
CREATE INDEX IF NOT EXISTS idx_persona_classifications_company 
ON persona_classifications(company_id);

CREATE INDEX IF NOT EXISTS idx_persona_classification_types_classification 
ON persona_classification_types(classification_id);

CREATE INDEX IF NOT EXISTS idx_persona_combinations_company 
ON persona_combinations(company_id);

CREATE INDEX IF NOT EXISTS idx_persona_type_mappings_company 
ON persona_type_mappings(company_id);

-- Companies table index for JOIN operations
CREATE INDEX IF NOT EXISTS idx_companies_id 
ON companies(id);

-- Add partial indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_interviewees_company_null_project 
ON interviewees(company_id) 
WHERE project_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_personas_company_null_project 
ON personas(company_id) 
WHERE project_id IS NULL AND active = true;

-- Add GIN index for JSONB columns if needed for performance

CREATE INDEX IF NOT EXISTS idx_interviewees_interview_detail 
ON interviewees USING gin(interview_detail) 
WHERE interview_detail IS NOT NULL;

-- Analyze tables after index creation for query planner optimization
ANALYZE interviewees;
ANALYZE personas;
ANALYZE project_members;
ANALYZE profiles;
ANALYZE main_topics;
ANALYZE persona_topic_documents;
ANALYZE persona_classifications;
ANALYZE persona_classification_types;
ANALYZE persona_combinations;
ANALYZE persona_type_mappings;
ANALYZE companies;