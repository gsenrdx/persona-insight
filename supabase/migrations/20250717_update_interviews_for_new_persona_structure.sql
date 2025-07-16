-- interviews 테이블을 새로운 페르소나 구조에 맞게 업데이트

-- 기존 persona_definitions 관련 외래키 제약 제거 (존재하는 경우)
ALTER TABLE interviews 
DROP CONSTRAINT IF EXISTS interviews_ai_persona_match_fkey,
DROP CONSTRAINT IF EXISTS interviews_confirmed_persona_definition_id_fkey;

-- 기존 컬럼 제거
ALTER TABLE interviews
DROP COLUMN IF EXISTS ai_persona_match,
DROP COLUMN IF EXISTS ai_persona_explanation,
DROP COLUMN IF EXISTS confirmed_persona_definition_id;

-- 새로운 persona_combination_id 컬럼 추가 (이미 있을 수 있으므로 IF NOT EXISTS 체크)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'interviews' 
                   AND column_name = 'persona_combination_id') THEN
        ALTER TABLE interviews 
        ADD COLUMN persona_combination_id UUID REFERENCES persona_combinations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- persona_combination_id에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_interviews_persona_combination_id 
ON interviews(persona_combination_id) 
WHERE persona_combination_id IS NOT NULL;

-- RLS 정책이 새로운 구조와 호환되는지 확인
-- (기존 정책이 persona_definitions를 참조하고 있을 수 있음)

-- 완료 메시지
DO $$ 
BEGIN
    RAISE NOTICE 'interviews 테이블이 새로운 페르소나 구조로 업데이트되었습니다.';
END $$;