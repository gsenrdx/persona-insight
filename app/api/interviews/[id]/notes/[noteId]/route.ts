import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'
import type { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH /api/interviews/[id]/notes/[noteId] - 메모 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    // params를 await
    const { id, noteId } = await params;
    
    // 인증 처리
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { userId } = await getAuthenticatedUserProfile(authorization, supabase)

    const { content } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    // 메모 수정 (RLS가 권한 확인)
    const { data: note, error } = await supabase
      .from('interview_notes')
      .update({ content })
      .eq('id', noteId)
      .eq('created_by', userId)
      .select(`
        *,
        created_by_profile:profiles!created_by(id, name, avatar_url),
        replies:interview_note_replies(
          *,
          created_by_profile:profiles!created_by(id, name, avatar_url)
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: note })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/interviews/[id]/notes/[noteId] - 메모 삭제 (소프트 삭제)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    // params를 await
    const { id, noteId } = await params;
    
    // 인증 처리
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await getAuthenticatedUserProfile(authorization, supabase)

    // 메모 소프트 삭제
    const { error } = await supabase
      .from('interview_notes')
      .update({ is_deleted: true })
      .eq('id', noteId)

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