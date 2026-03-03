import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/lib/types/supabase'
import { MemberStatus } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  ) as unknown as SupabaseClient<Database>

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public auth routes
  const authRoutes = ['/login', '/accept-invite', '/auth/callback', '/join', '/pending', '/api/invite/public']
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r))

  // If no session and not on auth route → redirect to login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // If session and on auth route → redirect to dashboard
  if (user && isAuthRoute && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Check member status (suspended / deactivated)
  if (user && !isAuthRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    const blockedStatuses: MemberStatus[] = ['suspended', 'deactivated']
    if (profile && blockedStatuses.includes(profile.status as MemberStatus)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'account_suspended')
      await supabase.auth.signOut()
      return NextResponse.redirect(url)
    }
    // Pending members can only access /pending
    if (profile?.status === 'pending' && !pathname.startsWith('/pending')) {
      const url = request.nextUrl.clone()
      url.pathname = '/pending'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
