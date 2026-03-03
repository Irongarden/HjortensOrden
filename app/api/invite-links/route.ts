import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

const INVITE_ROLES = ['admin', 'chairman', 'vice_chairman']

async function getAuthorisedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { user, role: profile?.role ?? '' }
}

// GET /api/invite-links — list all links (admin only)
export async function GET() {
  const ctx = await getAuthorisedUser()
  if (!ctx?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!INVITE_ROLES.includes(ctx.role)) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('public_invite_links')
    .select('*, creator:profiles!created_by(id, full_name)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/invite-links — create a new link
export async function POST(req: NextRequest) {
  const ctx = await getAuthorisedUser()
  if (!ctx?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!INVITE_ROLES.includes(ctx.role)) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const { label, expires_at, max_uses } = await req.json()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('public_invite_links')
    .insert({ label: label || null, expires_at, max_uses: max_uses || null, created_by: ctx.user.id })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
