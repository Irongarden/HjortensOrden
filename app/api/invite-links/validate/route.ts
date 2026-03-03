import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/invite-links/validate?token=...
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false, reason: 'missing_token' })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link, error } = await (admin as any)
    .from('public_invite_links')
    .select('*')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()

  if (error || !link) return NextResponse.json({ valid: false, reason: 'not_found' })

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, expired: true, reason: 'expired' })
  }

  if (link.max_uses !== null && link.uses_count >= link.max_uses) {
    return NextResponse.json({ valid: false, reason: 'max_uses_reached' })
  }

  return NextResponse.json({ valid: true })
}
