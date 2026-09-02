import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const origin = new URL(request.url).origin
  // POSTのまま/loginへ追従すると405になるため、GETへ切り替える。
  return NextResponse.redirect(`${origin}/login`, 303)
}
