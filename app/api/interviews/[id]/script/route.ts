import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'
import { Database } from '@/types/database'
import { z } from 'zod'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Request schema
const updateScriptSchema = z.object({
  scriptId: z.string(),
  cleanedSentence: z.string(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params
    
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabase)

    // Parse request body
    const body = await request.json()
    const { scriptId, cleanedSentence } = updateScriptSchema.parse(body)

    // Get current interview
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .eq('company_id', companyId)
      .single()

    if (fetchError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      )
    }

    // Parse cleaned_script
    const cleanedScript = interview.cleaned_script as any[]
    if (!Array.isArray(cleanedScript)) {
      return NextResponse.json(
        { error: 'Invalid script format' },
        { status: 400 }
      )
    }

    // Find and update the script item
    let updated = false
    const updatedScript = cleanedScript.map(item => {
      // Check if this is the item to update
      const itemId = Array.isArray(item.id) ? item.id.join('-') : item.id
      if (itemId === scriptId) {
        updated = true
        return {
          ...item,
          cleaned_sentence: cleanedSentence,
          last_edited_by: userId,
          last_edited_at: new Date().toISOString()
        }
      }
      return item
    })

    if (!updated) {
      return NextResponse.json(
        { error: 'Script item not found' },
        { status: 404 }
      )
    }

    // Update the interview
    const { data, error: updateError } = await supabase
      .from('interviews')
      .update({
        cleaned_script: updatedScript,
        updated_at: new Date().toISOString()
      })
      .eq('id', interviewId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update script', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        scriptId,
        cleanedSentence,
        lastEditedBy: userId,
        lastEditedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}