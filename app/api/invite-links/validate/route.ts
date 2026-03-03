import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/invite-links/validate?token=...
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false, reason: 'missing_token' })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link, error } = await (admin as any)
    .from('public_invite_links')
    .select('*')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()

  if (error) {
    console.error('[validate] supabase error:', error.message)
    return NextResponse.json({ valid: false, reason: 'db_error', detail: error.message })
  }

  if (!link) {
    // Debug: søg uden active-filter for at se om token overhovedet eksisterer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: anyLink } = await (admin as any)
      .from('public_invite_links')
      .select('token, active, expires_at, uses_count, max_uses')
      .eq('token', token)
      .maybeSingle()
    console.error('[validate] not_found – token_length:', token.length, '| found_without_active_filter:', !!anyLink, '| record:', anyLink)
    return NextResponse.json({ valid: false, reason: 'not_found', debug: { token_length: token.length, found_without_active_filter: !!anyLink, record: anyLink } })
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, expired: true, reason: 'expired' })
  }

  if (link.max_uses !== null && link.uses_count >= link.max_uses) {
    return NextResponse.json({ valid: false, reason: 'max_uses_reached' })
  }

  return NextResponse.json({ valid: true })
}
