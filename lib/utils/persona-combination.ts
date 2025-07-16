/**
 * 페르소나 조합에서 의미있는 이름을 생성하는 유틸리티 함수들
 */

export interface PersonaCombinationType {
  id: string
  name: string
  description: string
  persona_classifications?: {
    name: string
    description: string
  }
}

export interface PersonaCombination {
  id: string
  persona_code: string
  type_ids: string[]
  title?: string
  description?: string
  persona_classification_types?: PersonaCombinationType[]
}

/**
 * 페르소나 조합에서 표시할 이름을 생성
 * @param combination 페르소나 조합 데이터
 * @returns 사용자에게 표시할 페르소나 이름
 */
export function getPersonaCombinationDisplayName(combination: PersonaCombination | null | undefined): string {
  if (!combination) return ''

  // 1. title이 있으면 우선 사용
  if (combination.title) {
    return combination.title
  }

  // 2. 타입 정보가 있으면 타입 이름들을 조합
  if (combination.persona_classification_types && combination.persona_classification_types.length > 0) {
    const typeNames = combination.persona_classification_types
      .map(type => type?.name)
      .filter(Boolean)
    
    if (typeNames.length > 0) {
      return typeNames.join(' + ')
    }
  }

  // 3. 타입 정보가 없으면 persona_code 사용
  return combination.persona_code || ''
}

/**
 * 페르소나 조합의 설명을 생성
 * @param combination 페르소나 조합 데이터  
 * @returns 사용자에게 표시할 페르소나 설명
 */
export function getPersonaCombinationDescription(combination: PersonaCombination | null | undefined): string {
  if (!combination) return ''

  // 1. description이 있으면 우선 사용
  if (combination.description) {
    return combination.description
  }

  // 2. 분류 이름들을 조합
  if (combination.persona_classification_types && combination.persona_classification_types.length > 0) {
    const classificationNames = combination.persona_classification_types
      .map(type => type?.persona_classifications?.name)
      .filter(Boolean)
    
    if (classificationNames.length > 0) {
      return classificationNames.join(', ')
    }
  }

  return `${combination.persona_code || ''} 유형`
}

/**
 * 페르소나 조합의 짧은 제목 생성 (카드 등에 사용)
 * @param combination 페르소나 조합 데이터
 * @returns 짧은 제목
 */
export function getPersonaCombinationShortTitle(combination: PersonaCombination | null | undefined): string {
  if (!combination) return ''
  const displayName = getPersonaCombinationDisplayName(combination)
  return `${combination.persona_code || ''}: ${displayName}`
}