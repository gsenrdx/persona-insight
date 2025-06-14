// 컴포넌트 Props 타입 정의

import { PersonaData } from './persona'
import { Project } from './project'

export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface PersonaCardProps extends BaseComponentProps {
  persona: PersonaData
  onClick?: () => void
  isSelected?: boolean
}

export interface ProjectCardProps extends BaseComponentProps {
  project: Project
  onEdit?: () => void
  onDelete?: () => void
}

// PersonaSwitcher 전용 페르소나 타입 (UI에 특화된 필드들)
export interface PersonaSwitcherPersona {
  id: string
  name: string
  image?: string
  keywords?: string[]
  insight?: string
  summary?: string
  painPoint?: string
  hiddenNeeds?: string
}

export interface PersonaSwitcherProps extends BaseComponentProps {
  currentPersona: PersonaSwitcherPersona
  allPersonas: PersonaSwitcherPersona[]
  currentPersonaId: string
  showHeader?: boolean
}