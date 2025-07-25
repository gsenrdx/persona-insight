import { NextRequest } from 'next/server'
import { SUPPORTED_AUDIO_EXTENSIONS, MAX_AUDIO_FILE_SIZE_MB } from '@/lib/constants/file-upload'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'
export const maxDuration = 120 // 2분 타임아웃

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('audio') as File
    const userName = (formData.get('userName') as string) || '익명'
    const sttOptionsString = formData.get('sttOptions') as string
    
    // STT 옵션 파싱
    let sttOptions = {
      speakerDiarization: true,
      includeTimestamps: true,
      interviewFormat: true
    }
    
    if (sttOptionsString) {
      try {
        sttOptions = { ...sttOptions, ...JSON.parse(sttOptionsString) }
      } catch (error) {
        console.log('STT 옵션 파싱 실패, 기본값 사용:', error)
      }
    }

    // 파일 유효성 검증
    if (!file) {
      return new Response(JSON.stringify({
        error: '파일이 누락되었습니다.',
        message: '오디오 파일을 선택해주세요.'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 파일 크기 검증
    if (file.size > MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024) {
      return new Response(JSON.stringify({
        error: '파일 크기 제한',
        message: `파일 크기가 ${MAX_AUDIO_FILE_SIZE_MB}MB를 초과합니다.`
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 파일 확장자 검증
    const fileExtension = file.name.toLowerCase().match(/\.[^/.]+$/)?.[0]
    if (!fileExtension || !SUPPORTED_AUDIO_EXTENSIONS.includes(fileExtension)) {
      return new Response(JSON.stringify({
        error: '지원하지 않는 파일 형식',
        message: `지원 형식: ${SUPPORTED_AUDIO_EXTENSIONS.join(', ')}`
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Gemini API 키 확인 
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({
        error: 'API 설정 오류',
        message: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 디버깅 정보 로깅
    console.log('Audio file upload info:', {
      originalName: file.name,
      extension: fileExtension,
      size: file.size,
      sttOptions: sttOptions
    });

    // Supabase 클라이언트 초기화
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1단계: Supabase Storage에 파일 업로드
    // 파일명을 안전하게 정규화
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')  
      .replace(/_{2,}/g, '_')           
      .replace(/^_|_$/g, '')            
    
    const fileName = `audio-stt/${Date.now()}_${sanitizedFileName}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('interview-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return new Response(JSON.stringify({
        error: '파일 업로드 실패',
        message: '파일을 임시 저장소에 업로드하는데 실패했습니다.'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 2단계: Public URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('interview-files')
      .getPublicUrl(fileName)

    if (!publicUrl) {
      return new Response(JSON.stringify({
        error: 'URL 생성 실패',
        message: '파일의 공개 URL을 생성할 수 없습니다.'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('Generated public URL:', publicUrl)
    console.log('Sanitized file name:', sanitizedFileName)
    
    // 3단계: Gemini API로 STT 변환
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // 파일을 Gemini API에 업로드
    const uploadResponse = await fetch(publicUrl)
    const arrayBuffer = await uploadResponse.arrayBuffer()
    
    const audioFile = {
      inlineData: {
        data: Buffer.from(arrayBuffer).toString('base64'),
        mimeType: getMimeType(fileExtension)
      }
    }

    // STT 옵션에 따른 프롬프트 생성
    let prompt = "Generate a transcript of the speech."
    
    if (sttOptions.speakerDiarization) {
      prompt += " Identify and label different speakers as 'Interviewer:' and 'Interviewee:' for each dialogue."
    }
    
    if (sttOptions.includeTimestamps) {
      prompt += " Include timestamps in MM:SS format for each speaker turn."
    }
    
    if (sttOptions.interviewFormat) {
      prompt += " Format the output as a structured interview with clear speaker labels and natural dialogue flow."
    } else {
      prompt += " Provide a clean transcript without additional formatting."
    }
    
    prompt += " Please provide only the transcribed content as requested."
    
    console.log('Generated prompt for STT:', prompt)

    const result = await model.generateContent([prompt, audioFile])
    const transcribedText = result.response.text()

    if (!transcribedText || typeof transcribedText !== 'string' || transcribedText.trim().length === 0) {
      // 실패 시 임시 파일 정리
      await supabase.storage.from('interview-files').remove([fileName])
      
      return new Response(JSON.stringify({
        error: '변환 결과 없음',
        message: '음성에서 텍스트를 추출할 수 없습니다.',
        debug: {
          uploadedUrl: publicUrl,
          sanitizedFileName: sanitizedFileName,
          originalFileName: file.name
        }
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 성공 시 임시 파일 정리 (백그라운드)
    setTimeout(async () => {
      await supabase.storage.from('interview-files').remove([fileName])
    }, 5000) // 5초 후 정리

    return new Response(JSON.stringify({
      success: true,
      data: {
        transcribedText: transcribedText.trim(),
        fileName: file.name,
        fileSize: file.size,
        fileUrl: publicUrl, // URL 반환 (디버깅용)
        provider: 'gemini',
        sttOptions: sttOptions // 사용된 STT 옵션 정보
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: '서버 오류',
      message: error.message || 'STT 변환 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// MIME 타입 매핑 헬퍼 함수
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mp3',
    '.mpga': 'audio/mp3', 
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.webm': 'audio/webm',
    '.amr': 'audio/amr',
    '.aiff': 'audio/aiff',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac'
  }
  
  return mimeTypes[extension] || 'audio/wav'
} 