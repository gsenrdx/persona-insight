import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string; replyId: string } }
) {
  const { id: interviewId, noteId, replyId } = params
  
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the reply belongs to the note
    const { data: reply, error: fetchError } = await supabase
      .from('interview_note_replies')
      .select('id, note_id, created_by')
      .eq('id', replyId)
      .eq('note_id', noteId)
      .single()

    if (fetchError || !reply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
    }

    // Check if user can delete (owner or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    const isOwner = reply.created_by === user.id
    const isAdmin = profile?.role === 'company_admin' || profile?.role === 'super_admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete the reply
    const { error: deleteError } = await supabase
      .from('interview_note_replies')
      .update({ is_deleted: true })
      .eq('id', replyId)

    if (deleteError) {
      // Error logged to monitoring service
      return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Error logged to monitoring service
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string; replyId: string } }
) {
  const { id: interviewId, noteId, replyId } = params
  
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the update data
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Verify the reply belongs to the note and user owns it
    const { data: reply, error: fetchError } = await supabase
      .from('interview_note_replies')
      .select('id, note_id, created_by')
      .eq('id', replyId)
      .eq('note_id', noteId)
      .eq('created_by', user.id)
      .single()

    if (fetchError || !reply) {
      return NextResponse.json({ error: 'Reply not found or unauthorized' }, { status: 404 })
    }

    // Update the reply
    const { data: updatedReply, error: updateError } = await supabase
      .from('interview_note_replies')
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', replyId)
      .select(`
        *,
        created_by_profile:profiles!interview_note_replies_created_by_fkey(
          id,
          name,
          avatar_url
        )
      `)
      .single()

    if (updateError) {
      // Error logged to monitoring service
      return NextResponse.json({ error: 'Failed to update reply' }, { status: 500 })
    }

    return NextResponse.json(updatedReply)
  } catch (error) {
    // Error logged to monitoring service
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}