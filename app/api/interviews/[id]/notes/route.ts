import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'
import type { Database } from '@/types/supabase'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/interviews/[id]/notes - 인터뷰의 모든 메모 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // params를 await
    const { id } = await params;
    
    // 인증 처리
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await getAuthenticatedUserProfile(authorization, supabase)

    // 메모와 댓글 함께 조회
    const { data: notes, error } = await supabase
      .from('interview_notes')
      .select(`
        *,
        created_by_profile:profiles!created_by(id, name, avatar_url),
        replies:interview_note_replies(
          *,
          created_by_profile:profiles!created_by(id, name, avatar_url)
        )
      `)
      .eq('interview_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 댓글도 시간순 정렬
    const notesWithSortedReplies = notes?.map(note => ({
      ...note,
      replies: note.replies
        ?.filter((reply: any) => !reply.is_deleted)
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }))

    return NextResponse.json({ data: notesWithSortedReplies })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/interviews/[id]/notes - 새 메모 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // params를 await
    const { id } = await params;
    
    // 인증 처리
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabase)

    // 요청 본문 파싱
    const { scriptItemIds, content } = await request.json()

    if (!scriptItemIds || !content) {
      return NextResponse.json(
        { error: 'scriptItemIds and content are required' },
        { status: 400 }
      )
    }

    // Validate scriptItemIds is array
    if (!Array.isArray(scriptItemIds) || scriptItemIds.length === 0) {
      return NextResponse.json(
        { error: 'scriptItemIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate content length
    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content must be a non-empty string' },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'content must not exceed 2000 characters' },
        { status: 400 }
      )
    }


    // 메모 생성
    const { data: note, error } = await supabase
      .from('interview_notes')
      .insert({
        interview_id: id,
        script_item_ids: scriptItemIds,
        content,
        created_by: userId,
        company_id: companyId
      })
      .select(`
        *,
        created_by_profile:profiles!created_by(id, name, avatar_url)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { ...note, replies: [] } })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

