import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCallerContext, hasMinRole } from '@/app/api/_lib/auth'
import { sendEventNotification } from '../_lib/notify'

const adminSupabase = createAdminClient()

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await getCallerContext()
  if (!caller) return NextResponse.json({ error: 'Ikke autentificeret' }, { status: 401 })

  // Check ownership or permission
  const { data: event, error: eventError } = await adminSupabase
    .from('events')
    .select('created_by, status, title, description, starts_at')
    .eq('id', params.id)
    .maybeSingle()

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 })
  if (!event) return NextResponse.json({ error: 'Begivenhed ikke fundet' }, { status: 404 })

  const canEdit = hasMinRole(caller.role, 'vice_chairman') || event.created_by === caller.userId
  if (!canEdit) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (typeof body.title === 'string') updates.title = body.title
  if (typeof body.description === 'string' || body.description === null) updates.description = body.description
  if (typeof body.location === 'string' || body.location === null) updates.location = body.location
  if (typeof body.starts_at === 'string') updates.starts_at = body.starts_at
  if (typeof body.ends_at === 'string') updates.ends_at = body.ends_at
  if (typeof body.is_recurring === 'boolean') updates.is_recurring = body.is_recurring
  if (typeof body.recurrence_rule === 'string' || body.recurrence_rule === null) updates.recurrence_rule = body.recurrence_rule
  if (typeof body.budget_dkk === 'number' || body.budget_dkk === null) updates.budget_dkk = body.budget_dkk
  if (typeof body.cover_image_url === 'string' || body.cover_image_url === null) updates.cover_image_url = body.cover_image_url
  if (body.status === 'draft' || body.status === 'published' || body.status === 'cancelled' || body.status === 'completed') {
    updates.status = body.status
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Ingen gyldige felter at opdatere' }, { status: 400 })
  }

  const { error } = await adminSupabase.from('events').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Auto-send notification to all members when an event is first published
  if (updates.status === 'published' && event.status !== 'published') {
    // Fire-and-forget — don't block the response on email delivery
    sendEventNotification({
      eventId:       params.id,
      sentBy:        caller.userId,
      triggerType:   'auto_publish',
      skipRateLimit: true, // First publish is always allowed
    }).catch((err) => console.error('[event-notify] auto_publish failed:', err))
  }

  // Auto-create timeline entry when event is marked as completed
  if (updates.status === 'completed' && event.status !== 'completed') {
    // Only insert if no timeline entry already exists for this event
    const { data: existing, error: existingError } = await adminSupabase
      .from('timeline_entries')
      .select('id')
      .eq('event_id', params.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 })
    }

    if (!existing) {
      const entryDate = (updates.starts_at as string | undefined) ?? event.starts_at ?? new Date().toISOString()
      const { error: insertTimelineError } = await adminSupabase.from('timeline_entries').insert({
        title:       (updates.title as string | undefined) ?? event.title,
        description: (updates.description as string | null | undefined) ?? event.description ?? null,
        entry_date:  entryDate.slice(0, 10),
        type:        'major_event',
        event_id:    params.id,
        created_by:  caller.userId,
      } as never)
      if (insertTimelineError) {
        return NextResponse.json({ error: insertTimelineError.message }, { status: 400 })
      }
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await getCallerContext()
  if (!caller) return NextResponse.json({ error: 'Ikke autentificeret' }, { status: 401 })

  const { data: event, error: eventError } = await adminSupabase
    .from('events')
    .select('created_by')
    .eq('id', params.id)
    .maybeSingle()

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 })
  if (!event) return NextResponse.json({ error: 'Begivenhed ikke fundet' }, { status: 404 })

  const canDelete = hasMinRole(caller.role, 'chairman') || event.created_by === caller.userId
  if (!canDelete) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  const { error } = await adminSupabase.from('events').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
