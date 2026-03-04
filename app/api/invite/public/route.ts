import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/invite/public
// Body: { token, full_name, email, password }
export async function POST(req: NextRequest) {
  const { token, full_name, email, password, city } = await req.json()

  if (!token || !full_name || !email || !password) {
    return NextResponse.json({ error: 'Alle felter er påkrævet' }, { status: 400 })
  }

  const admin = createAdminClient()
  // Need a full admin client for auth.admin.createUser
  const adminFull = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Validate the invite link
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link, error: linkError } = await (admin as any)
    .from('public_invite_links')
    .select('*')
    .eq('token', token)
    .eq('active', true)
    .single()

  if (linkError || !link) {
    return NextResponse.json({ error: 'Ugyldigt eller inaktivt invitationslink' }, { status: 400 })
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Dette invitationslink er udløbet' }, { status: 400 })
  }

  if (link.max_uses !== null && link.uses_count >= link.max_uses) {
    return NextResponse.json({ error: 'Dette invitationslink er nået til maksimalt antal anvendelser' }, { status: 400 })
  }

  // 2. Create auth user
  const { data: authData, error: authError } = await adminFull.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError || !authData.user) {
    const msg = authError?.message ?? 'Kunne ikke oprette bruger'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 3. Update the auto-created profile row (trigger already inserted it) with pending status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (admin as any)
    .from('profiles')
    .update({
      email,
      full_name,
      role: 'member',
      status: 'pending',
      ...(city ? { city } : {}),
    })
    .eq('id', authData.user.id)

  if (profileError) {
    // Rollback: delete the auth user to avoid orphans
    await adminFull.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Kunne ikke oprette profil: ' + profileError.message }, { status: 500 })
  }

  // 4. Increment uses_count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('public_invite_links')
    .update({ uses_count: link.uses_count + 1 })
    .eq('id', link.id)

  return NextResponse.json({ ok: true })
}
