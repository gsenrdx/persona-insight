import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

// 요청 본문 스키마 정의
const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty.").max(500, "Message is too long (max 500 chars)."),
  // conversationId: z.string().uuid().optional(), // 예시: 추가 필드
});

// 일관된 API 응답을 위한 헬퍼 함수 (선택적)
const respondError = (message: string, status: number, details?: any) => {
  // 프로덕션 환경에서는 자세한 details를 클라이언트에 보내지 않을 수 있음
  const errorPayload: { message: string; details?: any } = { message };
  if (process.env.NODE_ENV === 'development' && details) {
    errorPayload.details = details;
  }
  return NextResponse.json({ success: false, error: errorPayload }, { status });
};

const respondSuccess = (data: any, status: number = 200) => {
  return NextResponse.json({ success: true, data }, { status });
};


export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonParseError: any) { // 타입 명시
      return respondError('Invalid JSON payload.', 400, jsonParseError.message);
    }


    // 1. 입력값 검증 (Zod 사용)
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      const errorDetails = parsed.error.errors.map(err => ({ path: err.path.join('.'), message: err.message }));
      return respondError('Invalid request payload.', 400, errorDetails);
    }

    const { message } = parsed.data; // 검증된 데이터 사용

    // 2. 핵심 비즈니스 로직 (예: AI 서비스 호출)
    if (message.toLowerCase().includes("service_unavailable_trigger")) {
      return respondError('AI service is currently unavailable.', 503); // Service Unavailable
    }
    if (message.toLowerCase().includes("internal_error_trigger")) {
      throw new Error("Simulated internal processing error in API route.");
    }
    if (message.toLowerCase().includes("unauthorized_trigger")) {
        return respondError('User is not authorized to perform this action.', 401); // Unauthorized
    }


    const aiResponse = `AI response to: "${message}" (processed at ${new Date().toLocaleTimeString()})`;

    return respondSuccess({ reply: aiResponse });

  } catch (error) {
    console.error("[API CHAT_POST ERROR]", error);

    if (error instanceof ZodError) {
      return respondError('Invalid request data.', 400, error.format());
    }
    // 실제 프로덕션에서는 error.message 직접 노출 지양
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return respondError('An unexpected error occurred on the server.', 500, errorMessage);
  }
}