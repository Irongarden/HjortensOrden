import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  sendEventNotification,
  getEventNotificationHistory,
  NOTIFY_RATE_LIMIT_DAYS,
} from '../../_lib/notify'

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

// ── GET /api/events/[id]/notify ─────────────────────────────────────────────
// Returns notification history for the event.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const caller = await getCallerInfo()
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
  const caller = await getCallerInfo()
  if (!caller) return NextResponse.json({ error: 'Ikke autentificeret' }, { status: 401 })

  // Must be at least vice_chairman OR the event creator
  // (creator check is also done in PATCH route — we re-check here)
  if (!hasMinRole(caller.role, 'vice_chairman')) {
    // Check if they're the event creator
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: ev } = await adminClient
      .from('events')
      .select('created_by')
      .eq('id', params.id)
      .single()
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
