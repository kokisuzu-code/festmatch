import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env'

function redirectWithAuthCookies(url: URL, authResponse: NextResponse) {
  const response = NextResponse.redirect(url)
  authResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
  return response
}

function isExpiredSessionError(error: { code?: string } | null) {
  return error?.code === 'refresh_token_not_found'
    || error?.code === 'refresh_token_already_used'
    || error?.code === 'session_expired'
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options as never))
      },
    },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const retiredApi = ['/api/cron/', '/api/notifications/', '/api/notify/']
  if (retiredApi.some((prefix) => pathname.startsWith(prefix)) || pathname === '/api/events/copy' || pathname === '/api/stripe/invoice' || pathname === '/api/stripe/checkout') return new NextResponse(null, { status: 410 })

  const legacyDashboardPaths = ['/events', '/browse', '/messages', '/review', '/schedule', '/my-applications', '/my-sales', '/kitchen-cars', '/plan', '/dev']
  if (legacyDashboardPaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return redirectWithAuthCookies(new URL(user ? '/dashboard' : '/login', request.url), supabaseResponse)
  if (pathname === '/vendor/sales/record') return redirectWithAuthCookies(new URL('/vendor/sales', request.url), supabaseResponse)

  const protectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/organizer') || pathname.startsWith('/vendor') || pathname.startsWith('/admin')
  if (!user && protectedPath) {
    const loginUrl = new URL('/login', request.url)
    if (isExpiredSessionError(authError)) loginUrl.searchParams.set('reason', 'session_expired')
    return redirectWithAuthCookies(loginUrl, supabaseResponse)
  }
  if (user && (pathname === '/login' || pathname === '/signup')) return redirectWithAuthCookies(new URL('/dashboard', request.url), supabaseResponse)
  if (!user && pathname === '/onboarding') return redirectWithAuthCookies(new URL('/login', request.url), supabaseResponse)

  if (user && (pathname.startsWith('/organizer') || pathname.startsWith('/vendor') || pathname === '/dashboard')) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (!profile) return redirectWithAuthCookies(new URL('/onboarding', request.url), supabaseResponse)
    if (pathname === '/dashboard') return redirectWithAuthCookies(new URL(profile.role === 'organizer' || profile.role === 'admin' ? '/organizer' : '/vendor', request.url), supabaseResponse)
    if (profile.role === 'organizer' && pathname.startsWith('/vendor')) return redirectWithAuthCookies(new URL('/organizer', request.url), supabaseResponse)
    if (profile.role === 'vendor' && pathname.startsWith('/organizer')) return redirectWithAuthCookies(new URL('/vendor', request.url), supabaseResponse)
  }

  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') return redirectWithAuthCookies(new URL('/dashboard', request.url), supabaseResponse)
  }

  if (pathname.startsWith('/embed/events/')) {
    const domains = (process.env.FESTMATCH_EMBED_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((domain) => domain.trim())
      .filter((domain) => /^https?:\/\/[^\s"';]+$/i.test(domain))
    supabaseResponse.headers.set('Content-Security-Policy', `frame-ancestors ${domains.length ? domains.join(' ') : "'none'"};`)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/organizer/:path*', '/vendor/:path*', '/admin/:path*', '/embed/events/:path*', '/events/:path*', '/browse/:path*', '/messages/:path*', '/review/:path*', '/schedule/:path*', '/my-applications/:path*', '/my-sales/:path*', '/kitchen-cars/:path*', '/plan/:path*', '/dev', '/api/cron/:path*', '/api/notifications/:path*', '/api/notify/:path*', '/api/events/copy', '/api/stripe/invoice', '/api/stripe/checkout', '/login', '/signup', '/onboarding'],
}
