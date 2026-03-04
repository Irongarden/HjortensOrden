import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import nodemailer from 'nodemailer'

// Service-role client bypasses RLS — only used server-side
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

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

function buildApprovalEmail(memberName: string, siteUrl: string) {
  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Velkommen til Hjortens Orden</title>
</head>
<body style="margin:0;padding:0;background:#1a1f27;font-family:Georgia,'Times New Roman',serif;color:#e8e0d0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1f27;">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1c2028;border:1px solid #2e3540;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
          <tr>
            <td style="background:#161b22;border-bottom:2px solid #cfa84a33;padding:28px 36px;">
              <p style="margin:0 0 6px 0;font-size:10px;color:#9a8e7e;text-transform:uppercase;letter-spacing:3px;font-family:Arial,sans-serif;">Hjortens Orden</p>
              <h1 style="margin:0;font-size:22px;color:#cfa84a;font-family:Georgia,serif;font-weight:normal;letter-spacing:1px;">Ansøgning godkendt</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px 24px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#e8e0d0;">Kære ${memberName},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#c8bfaf;">
                Vi er glade for at kunne meddele, at din ansøgning om medlemskab af <strong style="color:#cfa84a;">Hjortens Orden</strong> er blevet godkendt.
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.75;color:#c8bfaf;">
                Du kan nu logge ind og tage del i ordenens fællesskab.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}/login"
                       style="display:inline-block;padding:14px 32px;background:#cfa84a;color:#0f1115;font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.5px;">
                      Log ind her →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#6a6a75;">
                Har du spørgsmål, er du velkommen til at kontakte os.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 32px;">
              <p style="margin:0 0 4px;font-size:14px;color:#9a8e7e;">Med venlig hilsen,</p>
              <p style="margin:0;font-size:15px;color:#e8e0d0;font-weight:bold;">Hjortens Orden</p>
            </td>
          </tr>
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
</html>`
}

async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&countrycodes=dk,se,no,de`,
      { headers: { 'Accept-Language': 'da', 'User-Agent': 'HjortensOrden/1.0' } },
    )
    const results = await res.json()
    if (results.length > 0) return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
  } catch { /* ignore */ }
  return null
}

async function getCallerRole() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role as string | undefined
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const role = await getCallerRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })
  }

  const body = await req.json()
  const { email, ...profileFields } = body

  // Update auth email via admin API if provided
  if (email) {
    const { error: authErr } = await adminSupabase.auth.admin.updateUserById(params.id, { email })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })
    profileFields.email = email // keep profiles table in sync
  }

  // Geocode city when it's being set/changed
  if (profileFields.city) {
    const currentProfile = await adminSupabase.from('profiles').select('city').eq('id', params.id).single()
    const currentCity = currentProfile.data?.city
    if (profileFields.city !== currentCity || !currentProfile.data?.city) {
      const coords = await geocodeCity(profileFields.city)
      if (coords) {
        profileFields.lat = coords.lat
        profileFields.lng = coords.lng
      }
    }
  } else if (profileFields.city === '' || profileFields.city === null) {
    // City cleared — remove coordinates too
    profileFields.lat = null
    profileFields.lng = null
  }

  if (Object.keys(profileFields).length > 0) {
    const { error } = await adminSupabase.from('profiles').update(profileFields).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Send approval email when a pending member is activated
  if (profileFields.status === 'active') {
    try {
      const { data: member } = await adminSupabase
        .from('profiles')
        .select('full_name, email, status')
        .eq('id', params.id)
        .single()
      // Only email if they were just activated (profile fetch is post-update)
      const transporter = getTransporter()
      if (transporter && member?.email) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hjortensorden.dk'
        await transporter.sendMail({
          from: `"${process.env.SMTP_FROM_NAME ?? 'Hjortens Orden'}" <${process.env.SMTP_USER}>`,
          to: member.email,
          subject: 'Din ansøgning til Hjortens Orden er godkendt 🦌',
          html: buildApprovalEmail(member.full_name, siteUrl),
        })
      }
    } catch (emailErr) {
      // Email failure must not block the approval response
      console.error('[approve] email error:', emailErr)
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/members/[id] — reject a pending application (deletes user + sends rejection email)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const role = await getCallerRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })
  }

  // Fetch member details before deletion so we can email them
  const { data: member } = await adminSupabase
    .from('profiles')
    .select('full_name, email, status')
    .eq('id', params.id)
    .single()

  // Only allow rejecting pending applications
  if (!member) return NextResponse.json({ error: 'Bruger ikke fundet' }, { status: 404 })
  if (member.status !== 'pending') {
    return NextResponse.json({ error: 'Kan kun afvise afventende ansøgninger' }, { status: 400 })
  }

  // Delete from auth (cascades to profiles via FK trigger)
  const { error: deleteErr } = await adminSupabase.auth.admin.deleteUser(params.id)
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

  // Send rejection email
  try {
    const transporter = getTransporter()
    if (transporter && member.email) {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME ?? 'Hjortens Orden'}" <${process.env.SMTP_USER}>`,
        to: member.email,
        subject: 'Opdatering vedr. din ansøgning til Hjortens Orden',
        html: buildRejectionEmail(member.full_name),
      })
    }
  } catch (emailErr) {
    console.error('[reject] email error:', emailErr)
  }

  return NextResponse.json({ success: true })
}

function buildRejectionEmail(memberName: string) {
  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opdatering vedr. din ansøgning</title>
</head>
<body style="margin:0;padding:0;background:#1a1f27;font-family:Georgia,'Times New Roman',serif;color:#e8e0d0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1f27;">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1c2028;border:1px solid #2e3540;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
          <tr>
            <td style="background:#161b22;border-bottom:2px solid #2e3540;padding:28px 36px;">
              <p style="margin:0 0 6px 0;font-size:10px;color:#9a8e7e;text-transform:uppercase;letter-spacing:3px;font-family:Arial,sans-serif;">Hjortens Orden</p>
              <h1 style="margin:0;font-size:22px;color:#e8e0d0;font-family:Georgia,serif;font-weight:normal;letter-spacing:1px;">Vedr. din ansøgning</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px 24px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#e8e0d0;">Kære ${memberName},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#c8bfaf;">
                Tak for din interesse i at blive en del af <strong style="color:#e8e0d0;">Hjortens Orden</strong>.
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.75;color:#c8bfaf;">
                Vi har gennemgået din ansøgning og kan desværre meddele, at vi på nuværende tidspunkt ikke har mulighed for at imødekomme den.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#6a6a75;">
                Har du spørgsmål til afgørelsen, er du velkommen til at kontakte os.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 32px;">
              <p style="margin:0 0 4px;font-size:14px;color:#9a8e7e;">Med venlig hilsen,</p>
              <p style="margin:0;font-size:15px;color:#e8e0d0;font-weight:bold;">Hjortens Orden</p>
            </td>
          </tr>
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
</html>`
}
