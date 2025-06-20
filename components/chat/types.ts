import type { Message } from "ai/react"

// MISO 응답에서 오는 데이터 타입 정의
export interface MisoStreamData {
  misoConversationId?: string;
  [key: string]: any;
}

// 요약 데이터 타입 정의
export interface ContentItem {
  content: string;
  quote: string;
  relevance: number;
}

export interface Subtopic {
  title: string;
  content_items: ContentItem[];
}

export interface Topic {
  id: string;
  title: string;
  color: string;
  subtopics: Subtopic[];
}

export interface RootNode {
  text: string;
  subtitle: string;
}

export interface SummaryData {
  title: string;
  summary: string;
  root_node: RootNode;
  main_topics: Topic[];
}

// 확장된 메시지 타입 정의
export interface ExtendedMessage extends Message {
  // 응답한 페르소나 정보 추가
  respondingPersona?: {
    id: string;
    name: string;
    image?: string;
  };
  // 멘션된 페르소나들
  mentionedPersonas?: string[];
  metadata?: {
    isFollowUpQuestion?: boolean;
    originalMessageId?: string;
    [key: string]: any;
  };
}

export interface ChatInterfaceProps {
  personaId: string
  personaData: any
  allPersonas?: any[]
}