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

function returnDestination(value: string | null) {
  return value && /^\/(?:dashboard|organizer|vendor|admin)(?:\/|\?|$)/.test(value) ? value : null
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const claim = claimToken(searchParams.get('claim'))
  const role = intendedRole(searchParams.get('role'))
  const recovery = recoveryDestination(searchParams.get('next'))
  const next = returnDestination(searchParams.get('next'))
  const returnTo = returnDestination(searchParams.get('return_to'))

  if (!code) return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login?error=user_not_found`)

  if (recovery) {
    const query = new URLSearchParams()
    if (claim) query.set('claim', claim)
    if (returnTo) query.set('next', returnTo)
    return NextResponse.redirect(`${origin}${recovery}${query.size ? `?${query.toString()}` : ''}`)
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
  if (next) return NextResponse.redirect(`${origin}${next}`)
  return NextResponse.redirect(`${origin}/${profile.role === 'organizer' || profile.role === 'admin' ? 'organizer' : 'vendor'}`)
}
