import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const INVITE_ROLES = ['admin', 'chairman', 'vice_chairman']

export async function POST(req: NextRequest) {
  // Require authenticated session
  const supabaseUser = createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke autentificeret' }, { status: 401 })

  // Require admin-level role
  const { data: profile } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !INVITE_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { email, full_name, role } = await req.json()

  // Invite via Supabase Auth — sends OTP email using the invite template
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?email=${encodeURIComponent(email)}`,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Also record in member_invitations for tracking
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('member_invitations').insert({
    email,
    invited_by: data.user.id,
    token: crypto.randomUUID(),
    expires_at: expiresAt,
    accepted_at: null,
  }).maybeSingle()

  return NextResponse.json({ ok: true, id: data.user.id })
}
