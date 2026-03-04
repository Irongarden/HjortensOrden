import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function getCallerInfo() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { userId: user.id, role: data?.role as string | undefined }
}

const ROLE_RANK: Record<string, number> = {
  member: 1, librarian: 2, treasurer: 3, vice_chairman: 4, chairman: 5, admin: 6,
}
function hasMinRole(role: string | undefined, min: string) {
  return (ROLE_RANK[role ?? ''] ?? 0) >= (ROLE_RANK[min] ?? 99)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await getCallerInfo()
  if (!caller) return NextResponse.json({ error: 'Ikke autentificeret' }, { status: 401 })

  // Check ownership or permission
  const { data: event } = await adminSupabase
    .from('events')
    .select('created_by, status, title, description, starts_at')
    .eq('id', params.id)
    .single()

  const canEdit = hasMinRole(caller.role, 'vice_chairman') || event?.created_by === caller.userId
  if (!canEdit) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const body = await req.json()
  const { error } = await adminSupabase.from('events').update(body).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Auto-create timeline entry when event is marked as completed
  if (body.status === 'completed' && event?.status !== 'completed') {
    // Only insert if no timeline entry already exists for this event
    const { data: existing } = await adminSupabase
      .from('timeline_entries')
      .select('id')
      .eq('event_id', params.id)
      .maybeSingle()

    if (!existing) {
      const entryDate = body.starts_at ?? event?.starts_at ?? new Date().toISOString()
      await adminSupabase.from('timeline_entries').insert({
        title:       body.title ?? event?.title,
        description: body.description ?? event?.description ?? null,
        entry_date:  entryDate.slice(0, 10),
        type:        'major_event',
        event_id:    params.id,
        created_by:  caller.userId,
      } as never)
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await getCallerInfo()
  if (!caller) return NextResponse.json({ error: 'Ikke autentificeret' }, { status: 401 })

  const { data: event } = await adminSupabase
    .from('events')
    .select('created_by')
    .eq('id', params.id)
    .single()

  const canDelete = hasMinRole(caller.role, 'chairman') || event?.created_by === caller.userId
  if (!canDelete) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const { error } = await adminSupabase.from('events').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
