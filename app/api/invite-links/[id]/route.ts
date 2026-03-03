import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const INVITE_ROLES = ['admin', 'chairman', 'vice_chairman']

async function authorise() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !INVITE_ROLES.includes(profile.role)) return null
  return user
}

// PATCH /api/invite-links/[id] — toggle active
// DELETE /api/invite-links/[id] — remove link
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await authorise()) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const admin = createAdminClient()
  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('public_invite_links')
    .update(body)
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
  if (!await authorise()) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('public_invite_links')
    .delete()
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
