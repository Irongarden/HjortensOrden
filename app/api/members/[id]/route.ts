import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['admin', 'chairman', 'vice_chairman']
const TREASURER_ROLES = ['admin', 'chairman', 'vice_chairman', 'treasurer']

async function getAuthorisedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { user, role: profile?.role ?? '' }
}

// PATCH /api/members/[id] — update allowed member fields (e.g. auto_pay)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getAuthorisedUser()
  if (!ctx?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!TREASURER_ROLES.includes(ctx.role)) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const body = await req.json()
  const admin = createAdminClient()

  // Only allow specific safe fields via this endpoint
  const allowed: Record<string, unknown> = {}
  if (typeof body.auto_pay === 'boolean') allowed.auto_pay = body.auto_pay

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Ingen gyldige felter at opdatere' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('profiles').update(allowed).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE /api/members/[id] — permanently delete a member
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getAuthorisedUser()
  if (!ctx?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(ctx.role)) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const targetId = params.id

  // Cannot delete yourself
  if (targetId === ctx.user.id) {
    return NextResponse.json({ error: 'Du kan ikke slette dig selv' }, { status: 400 })
  }

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: targetProfile } = await (admin as any)
    .from('profiles')
    .select('role')
    .eq('id', targetId)
    .single()

  // Prevent deleting other admins unless you are admin yourself
  if (targetProfile?.role === 'admin' && ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Kun administratorer kan slette andre administratorer' }, { status: 403 })
  }

  // Delete profile row (FK cascades should handle related data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (admin as any)
    .from('profiles')
    .delete()
    .eq('id', targetId)

  if (profileError) {
    console.error('[delete member] profile error:', profileError.message)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Delete from Supabase Auth
  const { error: authError } = await admin.auth.admin.deleteUser(targetId)
  if (authError) {
    console.error('[delete member] auth error:', authError.message)
    // Profile already deleted — log but don't fail
  }

  return NextResponse.json({ success: true })
}
