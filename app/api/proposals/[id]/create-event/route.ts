import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const adminSupabase = createAdminClient()
// Some workshop/proposal tables are not yet present in generated DB types.
// Keep casts local to this route until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adminDb = adminSupabase as any

async function getUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

/**
 * POST /api/proposals/[id]/create-event
 *
 * Creates a calendar event from an arrangement proposal and links it back.
 * Uses the admin client to bypass the events INSERT RLS (which restricts to vice_chairman+).
 * Any authenticated member who owns or collaborates on the proposal may call this.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Ikke autentificeret' }, { status: 401 })

  // Verify the caller owns or collaborates on this proposal
  const { data: proposal, error: propErr } = await adminDb
    .from('arrangement_proposals')
    .select('id, title, description, location, proposed_date_from, proposed_date_to, estimated_budget, created_by, collaborator_ids, linked_event_id')
    .eq('id', params.id)
    .single()

  if (propErr || !proposal) return NextResponse.json({ error: 'Forslag ikke fundet' }, { status: 404 })

  const canAct =
    proposal.created_by === user.id ||
    (Array.isArray(proposal.collaborator_ids) && proposal.collaborator_ids.includes(user.id))

  if (!canAct) return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })

  // Don't create duplicates
  if (proposal.linked_event_id) {
    return NextResponse.json({ event_id: proposal.linked_event_id })
  }

  if (!proposal.proposed_date_from) {
    return NextResponse.json({ error: 'Ingen startdato sat på forslaget' }, { status: 422 })
  }

  const startAt = `${proposal.proposed_date_from}T12:00:00`
  const endAt   = proposal.proposed_date_to
    ? `${proposal.proposed_date_to}T20:00:00`
    : `${proposal.proposed_date_from}T20:00:00`

  // Create the event (admin bypasses RLS)
  const { data: evt, error: evtErr } = await adminDb
    .from('events')
    .insert({
      title:           proposal.title,
      description:     proposal.description ?? null,
      location:        proposal.location ?? null,
      starts_at:       startAt,
      ends_at:         endAt,
      status:          'published',
      created_by:      user.id,
      budget_dkk:      proposal.estimated_budget ?? null,
    })
    .select()
    .single()

  if (evtErr) return NextResponse.json({ error: evtErr.message }, { status: 400 })

  // Link event back to the proposal
  const { error: linkError } = await adminDb
    .from('arrangement_proposals')
    .update({ linked_event_id: evt.id })
    .eq('id', params.id)
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  // Auto-create a timeline entry so the event appears in the chronicle
  const { error: timelineError } = await adminDb
    .from('timeline_entries' as 'timeline_entries')
    .insert({
      title:       proposal.title,
      description: proposal.description ?? null,
      entry_date:  proposal.proposed_date_from!,
      type:        'major_event',
      event_id:    evt.id,
      created_by:  user.id,
    } as never)
  if (timelineError) {
    return NextResponse.json({ event_id: evt.id, warning: timelineError.message })
  }

  return NextResponse.json({ event_id: evt.id })
}
