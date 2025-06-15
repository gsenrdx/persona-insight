// 컴포넌트 Props 타입 정의

import React from 'react'
import { Project } from './project'
import { ExtractionCriteria } from './api'

// Re-export ExtractionCriteria for components
export type { ExtractionCriteria }

// === 기본 Props 타입들 ===
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface BaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface BaseActionProps {
  onClick?: () => void
  disabled?: boolean
}

// === Auth 컴포넌트 Props ===
export interface AuthGuardProps {
  children: React.ReactNode
}

export interface ProfileModalProps extends BaseModalProps {}

// === Persona 컴포넌트 Props ===
export interface PersonaCardProps {
  id: string
  name: string
  image: string
  keywords: string[]
  insight: string
  summary?: string
  painPoint: string
  hiddenNeeds: string
  persona_character?: string
  persona_type?: string
  persona_description?: string
}

export interface FloatingActionButtonProps {
  isProcessing: boolean
  activeJobsLength: number
  jobsLength: number
  completedJobsLength: number
  failedJobsLength: number
  overallProgress: number
  onButtonClick: () => void
}

export interface PersonaHeaderProps {
  name: string
  image?: string
  keywords: string[]
  insight: string
  painPoint: string
  hiddenNeeds: string
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

// === Workflow 관련 타입들 ===

export enum WorkflowStatus {
  PENDING = 'pending',
  PROCESSING = 'processing', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  PERSONA_SYNTHESIZING = 'persona_synthesizing',
  PERSONA_SYNTHESIS_COMPLETED = 'persona_synthesis_completed',
  PERSONA_SYNTHESIS_FAILED = 'persona_synthesis_failed'
}

export interface WorkflowJob {
  id: string
  fileName: string
  file: File
  status: WorkflowStatus
  progress: number
  startTime?: Date
  endTime?: Date
  result?: any
  error?: string
  personaType?: string
  synthesisResult?: any
  projectId?: string
  extractionCriteria?: ExtractionCriteria[]
}

// === Modal 컴포넌트 Props ===
export interface AddInterviewModalProps extends BaseModalProps {
  onClose?: () => void
  onComplete?: () => void
  onFilesSubmit?: (files: File[], criteria: ExtractionCriteria[], projectId?: string) => void | Promise<void>
  projectId?: string
}

export interface WorkflowProgressModalProps extends BaseModalProps {
  jobs: WorkflowJob[]
  onRetryJob: (jobId: string) => void
  onRemoveJob: (jobId: string) => void
  onClearCompleted: () => void
  onClearAll: () => void
  onAddMore: () => void
  onJobClick?: (job: WorkflowJob) => void
  onStartPersonaSynthesis?: (jobId: string) => void
}

export interface PersonaCriteriaModalProps extends BaseModalProps {
  projectId?: string
}

// === Chat 컴포넌트 Props ===
export interface ChatInterfaceProps {
  personaId: string
  personaData: any
}

// === Summary 컴포넌트 Props ===
export interface SummaryData {
  title: string
  summary: string
  root_node: {
    text: string
    subtitle: string
  }
  main_topics: Array<{
    id: string
    title: string
    color: string
    subtopics: Array<{
      title: string
      content_items: Array<{
        content: string
        quote: string
        relevance: number
      }>
    }>
  }>
}

export interface SummaryModalProps {
  isOpen: boolean
  onClose: () => void
  summaryData: SummaryData | null
  personaName?: string
  personaImage?: string
}

// === Project 컴포넌트 Props ===
export interface ProjectCardProps extends BaseComponentProps {
  project: Project
  onEdit?: () => void
  onDelete?: () => void
}

export interface ProjectInsightsProps {
  project: Project
}

export interface ProjectSettingsProps {
  project: Project
  onProjectUpdate: (project: Project) => void
}

// === UI 컴포넌트 Props ===
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

// === 공통 HTML 확장 Props ===
export interface InputProps extends React.ComponentProps<'input'> {}
export interface TextareaProps extends React.ComponentProps<'textarea'> {}
export interface DivProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface ButtonElementProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}