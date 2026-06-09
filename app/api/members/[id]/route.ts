import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCallerContext, hasMinRole } from '@/app/api/_lib/auth'

const admin = createAdminClient()

// PATCH /api/members/[id] — update allowed member fields (e.g. auto_pay)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const caller = await getCallerContext()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(caller.role, 'treasurer')) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const body = await req.json()

  // Only allow specific safe fields via this endpoint
  const allowed: Record<string, unknown> = {}
  if (typeof body.auto_pay === 'boolean') allowed.auto_pay = body.auto_pay

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Ingen gyldige felter at opdatere' }, { status: 400 })
  }

  const { error } = await admin.from('profiles').update(allowed).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE /api/members/[id] — permanently delete a member
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const caller = await getCallerContext()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(caller.role, 'vice_chairman')) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const targetId = params.id

  // Cannot delete yourself
  if (targetId === caller.userId) {
    return NextResponse.json({ error: 'Du kan ikke slette dig selv' }, { status: 400 })
  }

  const { data: targetProfile, error: targetProfileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', targetId)
    .maybeSingle()
  if (targetProfileError) {
    return NextResponse.json({ error: targetProfileError.message }, { status: 500 })
  }
  if (!targetProfile) {
    return NextResponse.json({ error: 'Medlem ikke fundet' }, { status: 404 })
  }

  // Prevent deleting other admins unless you are admin yourself
  if (targetProfile.role === 'admin' && caller.role !== 'admin') {
    return NextResponse.json({ error: 'Kun administratorer kan slette andre administratorer' }, { status: 403 })
  }

  // Delete profile row (FK cascades should handle related data)
  const { error: profileError } = await admin
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
