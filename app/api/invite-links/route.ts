import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCallerContext, hasMinRole } from '@/app/api/_lib/auth'

export const dynamic = 'force-dynamic'

const admin = createAdminClient()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adminDb = admin as any

// GET /api/invite-links — list all links (admin only)
export async function GET() {
  const caller = await getCallerContext()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(caller.role, 'vice_chairman')) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const { data, error } = await adminDb
    .from('public_invite_links')
    .select('*, creator:profiles!created_by(id, full_name)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/invite-links — create a new link
export async function POST(req: NextRequest) {
  const caller = await getCallerContext()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(caller.role, 'vice_chairman')) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const { label, expires_at, max_uses } = await req.json()
  const payload: { label: string | null; expires_at?: string | null; max_uses?: number | null; created_by: string } = {
    label: typeof label === 'string' && label.trim().length > 0 ? label.trim() : null,
    created_by: caller.userId,
  }
  if (typeof expires_at === 'string' || expires_at === null) payload.expires_at = expires_at
  if (typeof max_uses === 'number' || max_uses === null) payload.max_uses = max_uses

  const { data, error } = await adminDb
    .from('public_invite_links')
    .insert(payload)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
