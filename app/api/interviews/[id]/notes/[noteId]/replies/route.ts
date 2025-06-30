import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'
import type { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/interviews/[id]/notes/[noteId]/replies - 댓글 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    // 인증 처리
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabase)

    const { content } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    // params를 await
    const { noteId } = await params

    // 댓글 생성
    const { data: reply, error } = await supabase
      .from('interview_note_replies')
      .insert({
        note_id: noteId,
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

    return NextResponse.json({ data: reply })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/interviews/[id]/notes/[noteId]/replies/[replyId] - 댓글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    // URL에서 replyId 추출
    const url = new URL(request.url)
    const replyId = url.pathname.split('/').pop()

    // 인증 처리
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await getAuthenticatedUserProfile(authorization, supabase)

    // 댓글 소프트 삭제
    const { error } = await supabase
      .from('interview_note_replies')
      .update({ is_deleted: true })
      .eq('id', replyId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}