// 비즈니스 로직 관련 타입 정의

// 파일 업로드 및 분석 워크플로우 큐 아이템
export interface WorkflowQueueItem {
  id: string
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  error?: string
  startTime?: Date
  endTime?: Date
}

// 페르소나 채팅 메시지
export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  personaId?: string
}