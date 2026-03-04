import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['admin', 'chairman', 'vice_chairman', 'treasurer']

const MONTH_NAMES = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
]

function monthLabel(month: string) {
  const [year, m] = month.split('-')
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${year}`
}

function buildEmail(params: {
  memberName: string
  month: string
  fee: number
  kassererName: string
  kassererEmail: string
}) {
  const { memberName, month, fee, kassererName, kassererEmail } = params
  const feeFormatted = fee.toLocaleString('da-DK') + ' kr.'

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kontingentpåmindelse</title>
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
              <h1 style="margin:0;font-size:22px;color:#cfa84a;font-family:Georgia,serif;font-weight:normal;letter-spacing:1px;">Kontingentpåmindelse</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 24px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#e8e0d0;">Kære ${memberName},</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.75;color:#c8bfaf;">
                Vi skriver for at minde dig om, at dit kontingent for
                <strong style="color:#cfa84a;">${month}</strong>
                endnu ikke er registreret som betalt hos ordenens kasserer.
              </p>

              <!-- Amount box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#161b22;border:1px solid #cfa84a22;border-left:3px solid #cfa84a;border-radius:8px;padding:18px 24px;">
                    <p style="margin:0 0 4px;font-size:10px;color:#9a8e7e;text-transform:uppercase;letter-spacing:2px;font-family:Arial,sans-serif;">Skyldigt beløb</p>
                    <p style="margin:0;font-size:30px;font-family:'Courier New',Courier,monospace;color:#cfa84a;font-weight:700;letter-spacing:1px;">${feeFormatted}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#9a8e7e;">
                Har du allerede indbetalt, bedes du kontakte kassereren, så betalingen kan registreres i systemet.
              </p>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:0 36px 32px;">
              <p style="margin:0 0 4px;font-size:14px;color:#9a8e7e;line-height:1.7;">Med venlig hilsen,</p>
              <p style="margin:0 0 2px;font-size:15px;color:#e8e0d0;font-weight:bold;">${kassererName}</p>
              <a href="mailto:${kassererEmail}" style="font-size:13px;color:#cfa84a;text-decoration:none;">${kassererEmail}</a>
              <p style="margin:4px 0 0;font-size:12px;color:#6a6a75;">Kasserer · Hjortens Orden</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #2e3540;padding:16px 36px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a4a5a;font-family:Arial,sans-serif;">
                Hjortens Orden · Denne besked er automatisk genereret · Svar ikke på denne e-mail
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  // Verify caller is authenticated + has treasurer+ role
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!caller || !ALLOWED_ROLES.includes(caller.role as string)) {
    return NextResponse.json({ error: 'Adgang nægtet — kun kasserer eller højere' }, { status: 403 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Email-service ikke konfigureret. Tilføj RESEND_API_KEY i miljøvariablerne (se .env.local.example).' },
      { status: 503 },
    )
  }

  const { month } = await req.json()
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Ugyldig måned — brug formatet YYYY-MM' }, { status: 400 })
  }

  // Use service-role client to bypass RLS for reads
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch active members, paid members this month, fee setting, and kasserer info in parallel
  const [membersRes, paidRes, settingRes, kassererRes] = await Promise.all([
    admin.from('profiles').select('id, full_name, email').eq('status', 'active'),
    admin.from('payment_records').select('user_id').eq('period_month', month).eq('status', 'paid'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('treasury_settings').select('monthly_fee_dkk').maybeSingle(),
    admin.from('profiles').select('full_name, email').eq('role', 'treasurer').maybeSingle(),
  ])

  const members = membersRes.data ?? []
  const paidIds = new Set((paidRes.data ?? []).map((p: { user_id: string }) => p.user_id))
  const fee = Number(settingRes.data?.monthly_fee_dkk ?? 300)
  const kasserer = kassererRes.data as { full_name: string; email: string } | null

  const kassererName = kasserer?.full_name ?? 'Ordenens kasserer'
  const kassererEmail = kasserer?.email ?? (caller as { role: string } & { email?: string }).email ?? ''

  const unpaid = members.filter((m: { id: string }) => !paidIds.has(m.id))
  const label = monthLabel(month)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Hjortens Orden <onboarding@resend.dev>'

  let sent = 0
  const errors: string[] = []

  for (const member of unpaid as { id: string; full_name: string; email: string }[]) {
    const html = buildEmail({ memberName: member.full_name, month: label, fee, kassererName, kassererEmail })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [member.email],
        subject: `Påmindelse: Kontingent for ${label} afventer betaling`,
        html,
      }),
    })

    if (res.ok) {
      sent++
    } else {
      const errText = await res.text().catch(() => 'Ukendt fejl')
      errors.push(`${member.full_name} (${member.email}): ${errText}`)
      console.error('[send-reminders] Resend error:', errText)
    }
  }

  return NextResponse.json({ sent, total: unpaid.length, errors })
}
