import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'
import type { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// SSE를 위한 헤더 설정
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성화
}

interface PresenceData {
  userId: string
  userName?: string
  email?: string
  avatarUrl?: string
  lastActiveAt: string
  location?: string // 어떤 인터뷰를 보고 있는지
}

// GET /api/presence/[projectId]/stream - SSE로 presence 스트리밍
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    
    // 인증 처리 (SSE는 헤더 설정이 불가능하므로 URL 파라미터 사용)
    const token = request.nextUrl.searchParams.get('token')
    const authorization = request.headers.get('authorization') || (token ? `Bearer ${token}` : null)
    
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabase)
    
    // 프로젝트 접근 권한 확인
    const { data: member } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()
      
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // SSE 스트림 생성
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        // 현재 활성 사용자 가져오기
        const getActiveUsers = async () => {
          // Redis나 메모리 스토어에서 가져와야 하지만, 
          // 일단은 데이터베이스에서 가져오는 것으로 구현
          const { data: recentActivities } = await supabase
            .from('project_members')
            .select(`
              user_id,
              profiles!inner(
                id,
                name,
                email,
                avatar_url
              )
            `)
            .eq('project_id', projectId)
            .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5분 이내 활동
            
          const presenceData: PresenceData[] = recentActivities?.map(activity => ({
            userId: activity.user_id,
            userName: activity.profiles.name || undefined,
            email: activity.profiles.email || undefined,
            avatarUrl: activity.profiles.avatar_url || undefined,
            lastActiveAt: new Date().toISOString()
          })) || []
          
          return presenceData
        }
        
        // 초기 presence 데이터 전송
        const sendPresence = async () => {
          try {
            const users = await getActiveUsers()
            const data = `data: ${JSON.stringify({ users, timestamp: Date.now() })}\n\n`
            controller.enqueue(encoder.encode(data))
          } catch (error) {
            // Error in sending presence data - stream will be closed
          }
        }
        
        // 하트비트 전송 (연결 유지)
        const sendHeartbeat = () => {
          controller.enqueue(encoder.encode(':heartbeat\n\n'))
        }
        
        // 즉시 초기 데이터 전송
        await sendPresence()
        
        // 60초마다 presence 업데이트
        const presenceInterval = setInterval(sendPresence, 60000)
        
        // 30초마다 하트비트
        const heartbeatInterval = setInterval(sendHeartbeat, 30000)
        
        // 연결 종료 시 정리
        request.signal.addEventListener('abort', () => {
          clearInterval(presenceInterval)
          clearInterval(heartbeatInterval)
          controller.close()
        })
      }
    })
    
    return new Response(stream, { headers: SSE_HEADERS })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/presence/[projectId] - 자신의 presence 업데이트
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    
    // 인증 처리
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { userId } = await getAuthenticatedUserProfile(authorization, supabase)
    
    // 요청 본문 파싱
    const { location, status } = await request.json()
    
    // 프로젝트 멤버 업데이트 (임시로 updated_at 사용)
    const { error } = await supabase
      .from('project_members')
      .update({ 
        updated_at: new Date().toISOString(),
        // metadata 필드가 있다면 거기에 저장
      })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      
    if (error) {
      throw error
    }
    
    // TODO: Redis나 메모리 스토어에 presence 정보 저장
    // await redis.setex(
    //   `presence:${projectId}:${userId}`,
    //   300, // 5분 TTL
    //   JSON.stringify({ location, status, lastActiveAt: Date.now() })
    // )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}