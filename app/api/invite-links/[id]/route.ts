import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCallerContext, hasMinRole } from '@/app/api/_lib/auth'

const admin = createAdminClient()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adminDb = admin as any

// PATCH /api/invite-links/[id] — toggle active
// DELETE /api/invite-links/[id] — remove link
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const caller = await getCallerContext()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(caller.role, 'vice_chairman')) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const body = await req.json()
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Kun feltet "active" kan opdateres' }, { status: 400 })
  }
  const { data, error } = await adminDb
    .from('public_invite_links')
    .update({ active: body.active })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const caller = await getCallerContext()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(caller.role, 'vice_chairman')) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const { error } = await adminDb
    .from('public_invite_links')
    .delete()
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
