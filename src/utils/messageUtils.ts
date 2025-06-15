// 임시 클라이언트 측 ID 생성을 위한 간단한 카운터 (실제 앱에서는 UUID 등 사용)
let tempIdCounter = Date.now();

export interface ClientMessage {
  id: number; // 임시 클라이언트 ID
  text: string;
  sender: 'user';
  timestamp?: number; // 서버에서 확정되기 전에는 없을 수 있음
  status?: 'sending' | 'sent' | 'failed';
}

export function createClientMessage(text: string): ClientMessage {
  return {
    id: tempIdCounter++,
    text,
    sender: 'user',
    status: 'sending',
  };
}
