import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function getUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
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
  const { data: proposal, error: propErr } = await adminSupabase
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
  const { data: evt, error: evtErr } = await adminSupabase
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
  await adminSupabase
    .from('arrangement_proposals')
    .update({ linked_event_id: evt.id })
    .eq('id', params.id)

  // Auto-create a timeline entry so the event appears in the chronicle
  await adminSupabase
    .from('timeline_entries' as 'timeline_entries')
    .insert({
      title:       proposal.title,
      description: proposal.description ?? null,
      entry_date:  proposal.proposed_date_from!,
      type:        'major_event',
      event_id:    evt.id,
      created_by:  user.id,
    } as never)

  return NextResponse.json({ event_id: evt.id })
}
