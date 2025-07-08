// 비즈니스 로직 관련 타입 정의

// 페르소나 채팅 메시지
export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  personaId?: string
}