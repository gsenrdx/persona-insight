export interface MessagePayload {
  message: string;
}

// 서버 응답에 따른 SentMessage 타입 (성공 시 data 객체 내부)
export interface SentMessage {
  id?: string; // 서버에서 생성된 ID (API 응답에 따라 선택적일 수 있음)
  reply: string; // API 응답의 핵심 내용
  timestamp?: number; // 서버에서 생성된 타임스탬프
}

// API 응답 전체 구조
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any; // Zod 에러의 경우 [{path, message}] 배열 등
  };
}

// 커스텀 에러 타입
export class ApiError extends Error {
  status?: number;
  details?: any;

  constructor(message: string, status?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    // Object.setPrototypeOf(this, ApiError.prototype); // ES6에서 필요할 수 있음
  }
}


export async function sendMessageToServer(payload: MessagePayload): Promise<SentMessage> {
  let response: Response;
  try {
    response = await fetch('/api/chat', { // 경로 수정 (app router 기준)
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (networkError: any) {
    // 네트워크 연결 실패 등 fetch 자체가 실패한 경우
    console.error("Network error:", networkError);
    throw new ApiError("Network error, please check your connection.", undefined, networkError.message);
  }

  let responseData: ApiResponse<SentMessage>;
  try {
    responseData = await response.json();
  } catch (jsonError: any) {
    // JSON 파싱 실패 (서버가 유효한 JSON을 보내지 않은 경우)
    console.error("JSON parsing error:", jsonError);
    // 서버 응답 텍스트를 포함하여 디버깅 정보 제공
    const responseText = await response.text().catch(() => "Could not read response text.");
    throw new ApiError(`Failed to parse server response. Status: ${response.status}`, response.status, responseText);
  }

  if (!response.ok || !responseData.success) {
    // HTTP 에러 상태 또는 응답 내 success: false 인 경우
    const errorMessage = responseData.error?.message || `API request failed with status ${response.status}`;
    console.error("API Error:", errorMessage, responseData.error?.details);
    throw new ApiError(errorMessage, response.status, responseData.error?.details);
  }

  if (!responseData.data) {
    // 성공했지만 데이터가 없는 경우 (API 설계에 따라 발생 가능)
    console.error("API Error: No data returned on success.");
    throw new ApiError('No data returned from server.', response.status);
  }

  // 성공 시 SentMessage 데이터 반환 (실제로는 responseData.data가 SentMessage 타입이어야 함)
  // API 응답에서 reply 필드를 text로 매핑하거나, SentMessage 타입 변경 필요
  // 현재 API는 { reply: "..." } 를 반환하므로, 이를 맞춤.
  return { reply: responseData.data.reply, timestamp: Date.now() }; // id 등은 API 응답에 따라 추가
}
