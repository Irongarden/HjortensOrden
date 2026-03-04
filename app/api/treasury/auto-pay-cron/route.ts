import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

// Vercel sends Authorization: Bearer <CRON_SECRET> on every cron invocation.
// Set CRON_SECRET to any random string in your Vercel environment variables
// to prevent unauthorised calls.
function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // no secret configured → allow (fine for private projects)
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const month = format(new Date(), 'yyyy-MM')

  // Fetch all active members with auto_pay enabled
  const { data: autoMembers, error: membersErr } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('status', 'active')
    .eq('auto_pay', true)

  if (membersErr) {
    console.error('[auto-pay-cron] members error:', membersErr.message)
    return NextResponse.json({ error: membersErr.message }, { status: 500 })
  }

  if (!autoMembers || autoMembers.length === 0) {
    console.log('[auto-pay-cron] No auto-pay members found')
    return NextResponse.json({ registered: 0, month })
  }

  // Find which of them have already paid this month
  const { data: paid } = await admin
    .from('payment_records')
    .select('user_id')
    .eq('period_month', month)
    .eq('status', 'paid')
    .in('user_id', autoMembers.map((m) => m.id))

  const paidIds = new Set((paid ?? []).map((p) => p.user_id))
  const unpaid = autoMembers.filter((m) => !paidIds.has(m.id))

  if (unpaid.length === 0) {
    console.log(`[auto-pay-cron] All auto-pay members already registered for ${month}`)
    return NextResponse.json({ registered: 0, month, message: 'Already up to date' })
  }

  // Read the configured monthly fee
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: setting } = await (admin as any)
    .from('treasury_settings')
    .select('monthly_fee_dkk')
    .maybeSingle()
  const amount = Number(setting?.monthly_fee_dkk ?? 300)

  let registered = 0
  const errors: string[] = []

  for (const member of unpaid as { id: string; full_name: string }[]) {
    // Upsert payment record
    const { error: payErr } = await admin
      .from('payment_records')
      .upsert(
        {
          user_id: member.id,
          period_month: month,
          amount_dkk: amount,
          paid_at: new Date().toISOString(),
          status: 'paid',
          // no registered_by — this is automatic
        },
        { onConflict: 'user_id,period_month' },
      )

    if (payErr) {
      errors.push(`${member.full_name}: ${payErr.message}`)
      console.error('[auto-pay-cron] payment_records error:', payErr.message)
      continue
    }

    // Create treasury transaction for this payment
    const { error: txErr } = await admin
      .from('treasury_transactions')
      .insert({
        type: 'income' as const,
        amount_dkk: amount,
        description: `Kontingent ${month} — ${member.full_name} (automatisk)`,
        category: 'Kontingent',
        transaction_date: new Date().toISOString().slice(0, 10),
      })

    if (txErr) {
      errors.push(`${member.full_name} tx: ${txErr.message}`)
      console.error('[auto-pay-cron] treasury_transactions error:', txErr.message)
    } else {
      registered++
    }
  }

  console.log(`[auto-pay-cron] ${month}: registered ${registered}/${unpaid.length}`)
  return NextResponse.json({ registered, total: unpaid.length, month, errors })
}
