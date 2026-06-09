import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCallerContext, hasMinRole } from '@/app/api/_lib/auth'
import {
  sendEventNotification,
  getEventNotificationHistory,
  NOTIFY_RATE_LIMIT_DAYS,
} from '../../_lib/notify'

const adminClient = createAdminClient()

// ── GET /api/events/[id]/notify ─────────────────────────────────────────────
// Returns notification history for the event.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const caller = await getCallerContext()
  if (!caller) return NextResponse.json({ error: 'Ikke autentificeret' }, { status: 401 })

  const history = await getEventNotificationHistory(params.id)
  return NextResponse.json({ history })
}

// ── POST /api/events/[id]/notify ────────────────────────────────────────────
// Manually sends notification to all active members.
// Rate-limited to once per NOTIFY_RATE_LIMIT_DAYS days.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const caller = await getCallerContext()
  if (!caller) return NextResponse.json({ error: 'Ikke autentificeret' }, { status: 401 })

  // Must be at least vice_chairman OR the event creator
  // (creator check is also done in PATCH route — we re-check here)
  if (!hasMinRole(caller.role, 'vice_chairman')) {
    // Check if they're the event creator
    const { data: ev, error: eventError } = await adminClient
      .from('events')
      .select('created_by')
      .eq('id', params.id)
      .maybeSingle()
    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 400 })
    }
    if (!ev || ev.created_by !== caller.userId) {
      return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })
    }
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json(
      { error: 'E-mail-service ikke konfigureret. Tilføj SMTP_USER og SMTP_PASS i miljøvariablerne.' },
      { status: 503 },
    )
  }

  const result = await sendEventNotification({
    eventId:        params.id,
    sentBy:         caller.userId,
    triggerType:    'manual',
    skipRateLimit:  false,
  })

  if (result.skipped) {
    const until = result.rateLimitedUntil
      ? new Date(result.rateLimitedUntil).toLocaleDateString('da-DK', {
          day: 'numeric', month: 'long',
        })
      : `om ${NOTIFY_RATE_LIMIT_DAYS} dage`
    return NextResponse.json(
      { error: `Der er allerede sendt en notifikation for nylig. Næste send er tilladt ${until}.`, rateLimitedUntil: result.rateLimitedUntil },
      { status: 429 },
    )
  }

  return NextResponse.json({
    sent:           result.sent,
    recipientCount: result.recipientCount,
  })
}
