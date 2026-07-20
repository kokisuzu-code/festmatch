import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function intendedRole(value: string | null) {
  return value === 'vendor' ? 'vendor' : 'organizer'
}

function claimToken(value: string | null) {
  return value && /^(?:[A-Za-z0-9_-]{43}|[a-f0-9-]{36})$/i.test(value) ? value : null
}

function recoveryDestination(value: string | null) {
  return value === '/reset-password' ? value : null
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const claim = claimToken(searchParams.get('claim'))
  const role = intendedRole(searchParams.get('role'))
  const next = recoveryDestination(searchParams.get('next'))

  if (!code) return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login?error=user_not_found`)

  if (next) {
    const query = new URLSearchParams()
    if (claim) query.set('claim', claim)
    return NextResponse.redirect(`${origin}${next}${query.size ? `?${query.toString()}` : ''}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const query = new URLSearchParams({ role })
    if (claim) query.set('claim', claim)
    return NextResponse.redirect(`${origin}/onboarding?${query.toString()}`)
  }

  if (claim) return NextResponse.redirect(`${origin}/claim?token=${encodeURIComponent(claim)}`)
  return NextResponse.redirect(`${origin}/${profile.role === 'organizer' || profile.role === 'admin' ? 'organizer' : 'vendor'}`)
}
