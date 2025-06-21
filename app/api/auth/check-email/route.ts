import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Admin 권한으로 auth.users 테이블에서 이메일 존재 여부 확인
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to check email' },
        { status: 500 }
      )
    }

    // 이메일이 이미 존재하는지 확인
    const exists = data.users.some(user => 
      user.email?.toLowerCase() === email.toLowerCase()
    )

    return NextResponse.json({ exists })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}