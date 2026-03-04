/**
 * Shared server-only helper for sending event notifications.
 *
 * Imported by:
 *  - app/api/events/[id]/notify/route.ts  (manual trigger, enforces rate limit)
 *  - app/api/events/[id]/route.ts         (auto-trigger on first publish, skips rate limit)
 */
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const NOTIFY_RATE_LIMIT_DAYS = 7

// ── SMTP ────────────────────────────────────────────────────────────────────

function getTransporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user, pass },
  })
}

// ── Email Template ──────────────────────────────────────────────────────────

function buildEventNotificationEmail(p: {
  memberName: string
  eventTitle: string
  eventDate: string
  eventLocation: string | null
  description: string | null
  siteUrl: string
  eventId: string
  isReminder: boolean
}) {
  const subject = p.isReminder
    ? `Påmindelse: ${p.eventTitle} nærmer sig 🦌`
    : `Nyt arrangement: ${p.eventTitle} 🦌`

  const intro = p.isReminder
    ? `Dette er en påmindelse om det kommende arrangement.`
    : `Vi er glade for at annoncere et nyt arrangement hos <strong style="color:#cfa84a;">Hjortens Orden</strong>.`

  return {
    subject,
    html: `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#1a1f27;font-family:Georgia,'Times New Roman',serif;color:#e8e0d0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1f27;">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1c2028;border:1px solid #2e3540;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#161b22;border-bottom:2px solid #cfa84a33;padding:28px 36px;">
              <p style="margin:0 0 6px 0;font-size:10px;color:#9a8e7e;text-transform:uppercase;letter-spacing:3px;font-family:Arial,sans-serif;">Hjortens Orden</p>
              <h1 style="margin:0;font-size:22px;color:#cfa84a;font-family:Georgia,serif;font-weight:normal;letter-spacing:1px;">
                ${p.isReminder ? 'Påmindelse' : 'Nyt arrangement'}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 24px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#e8e0d0;">Kære ${p.memberName},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#c8bfaf;">${intro}</p>

              <!-- Event card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#12161c;border:1px solid #cfa84a33;border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px 16px;border-bottom:1px solid #2e3540;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9a8e7e;text-transform:uppercase;letter-spacing:2px;font-family:Arial,sans-serif;">Arrangement</p>
                    <p style="margin:0;font-size:19px;color:#e8e0d0;font-family:Georgia,serif;">${p.eventTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:10px;">
                          <p style="margin:0 0 2px;font-size:11px;color:#9a8e7e;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,sans-serif;">Dato &amp; tid</p>
                          <p style="margin:0;font-size:14px;color:#cfa84a;">${p.eventDate}</p>
                        </td>
                      </tr>
                      ${p.eventLocation ? `
                      <tr>
                        <td style="padding-bottom:10px;">
                          <p style="margin:0 0 2px;font-size:11px;color:#9a8e7e;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,sans-serif;">Sted</p>
                          <p style="margin:0;font-size:14px;color:#e8e0d0;">${p.eventLocation}</p>
                        </td>
                      </tr>` : ''}
                      ${p.description ? `
                      <tr>
                        <td>
                          <p style="margin:0 0 2px;font-size:11px;color:#9a8e7e;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,sans-serif;">Beskrivelse</p>
                          <p style="margin:0;font-size:14px;color:#c8bfaf;line-height:1.6;">${p.description.slice(0, 300)}${p.description.length > 300 ? '…' : ''}</p>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${p.siteUrl}/events/${p.eventId}"
                       style="display:inline-block;padding:14px 32px;background:#cfa84a;color:#0f1115;font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.5px;">
                      Se detaljer og tilmeld dig →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;line-height:1.7;color:#6a6a75;">
                Du modtager denne besked fordi du er et aktivt medlem af Hjortens Orden.
              </p>
            </td>
          </tr>

          <!-- Sign-off -->
          <tr>
            <td style="padding:0 36px 28px;">
              <p style="margin:0 0 4px;font-size:14px;color:#9a8e7e;">Med venlig hilsen,</p>
              <p style="margin:0;font-size:15px;color:#e8e0d0;font-weight:bold;">Hjortens Orden</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #2e3540;padding:16px 36px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a4a5a;font-family:Arial,sans-serif;">
                Hjortens Orden · Denne besked er automatisk genereret
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  }
}

// ── Public helpers ──────────────────────────────────────────────────────────

export interface EventNotificationRecord {
  id: string
  event_id: string
  sent_by: string | null
  sent_at: string
  recipient_count: number
  trigger_type: 'auto_publish' | 'manual'
  sender?: { full_name: string; avatar_url: string | null } | null
}

/** Returns the notification history for an event, newest first. */
export async function getEventNotificationHistory(
  eventId: string,
): Promise<EventNotificationRecord[]> {
  const { data } = await admin
    .from('event_notifications')
    .select('*, sender:profiles!event_notifications_sent_by_fkey(full_name, avatar_url)')
    .eq('event_id', eventId)
    .order('sent_at', { ascending: false })
  return (data ?? []) as EventNotificationRecord[]
}

export interface NotifyResult {
  sent: number
  /** True when rate-limited — no notification was sent. */
  skipped: boolean
  /** ISO string of when the next send becomes allowed (if skipped). */
  rateLimitedUntil: string | null
  recipientCount: number
}

/**
 * Core function — sends email + in-app notifications to ALL active members
 * for the given event and records the action in event_notifications.
 *
 * @param skipRateLimit  Pass true for auto-publish triggers (first send ever).
 */
export async function sendEventNotification(params: {
  eventId: string
  sentBy: string | null
  triggerType: 'auto_publish' | 'manual'
  skipRateLimit?: boolean
}): Promise<NotifyResult> {
  const { eventId, sentBy, triggerType, skipRateLimit = false } = params

  // ── Rate-limit check ──
  if (!skipRateLimit) {
    const { data: lastRow } = await admin
      .from('event_notifications')
      .select('sent_at')
      .eq('event_id', eventId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastRow?.sent_at) {
      const daysSince =
        (Date.now() - new Date(lastRow.sent_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < NOTIFY_RATE_LIMIT_DAYS) {
        const nextAllowed = new Date(
          new Date(lastRow.sent_at).getTime() + NOTIFY_RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000,
        )
        return {
          sent: 0,
          skipped: true,
          rateLimitedUntil: nextAllowed.toISOString(),
          recipientCount: 0,
        }
      }
    }
  }

  // ── Fetch event ──
  const { data: event, error: evErr } = await admin
    .from('events')
    .select('id, title, description, starts_at, location, status')
    .eq('id', eventId)
    .single()

  if (evErr || !event) {
    return { sent: 0, skipped: false, rateLimitedUntil: null, recipientCount: 0 }
  }

  // ── Fetch all active members ──
  const { data: members } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('status', 'active')

  if (!members?.length) {
    return { sent: 0, skipped: false, rateLimitedUntil: null, recipientCount: 0 }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hjortensorden.dk'
  const isReminder = triggerType === 'manual'

  let eventDate: string
  try {
    eventDate = format(new Date(event.starts_at), "EEEE d. MMMM 'kl.' HH:mm", { locale: da })
  } catch {
    eventDate = event.starts_at
  }

  // ── Send emails ──
  const transporter = getTransporter()
  let emailsSent = 0

  if (transporter) {
    const { subject, html } = buildEventNotificationEmail({
      memberName: '__NAME__',
      eventTitle: event.title,
      eventDate,
      eventLocation: event.location,
      description: event.description,
      siteUrl,
      eventId: event.id,
      isReminder,
    })

    const fromLine = `"${process.env.SMTP_FROM_NAME ?? 'Hjortens Orden'}" <${process.env.SMTP_USER}>`

    for (const member of members) {
      const personalHtml = html.replace('Kære __NAME__,', `Kære ${member.full_name},`)
      try {
        await transporter.sendMail({
          from: fromLine,
          to: member.email,
          subject,
          html: personalHtml,
        })
        emailsSent++
      } catch (err) {
        console.error('[event-notify] SMTP error for', member.email, err)
      }
    }
  }

  // ── In-app notifications ──
  const notifType = isReminder ? 'event_reminder' : 'event_created'
  const notifTitle = isReminder
    ? `Påmindelse: ${event.title}`
    : `Nyt arrangement: ${event.title}`
  const notifMessage = `${eventDate}${event.location ? ` · ${event.location}` : ''}`

  await admin.from('notifications').insert(
    members.map((m) => ({
      user_id:    m.id,
      title:      notifTitle,
      message:    notifMessage,
      type:       notifType,
      action_url: `/events/${eventId}`,
    })),
  )

  // ── Record in log ──
  await admin.from('event_notifications').insert({
    event_id:        eventId,
    sent_by:         sentBy,
    recipient_count: members.length,
    trigger_type:    triggerType,
  })

  return {
    sent: emailsSent,
    skipped: false,
    rateLimitedUntil: null,
    recipientCount: members.length,
  }
}
