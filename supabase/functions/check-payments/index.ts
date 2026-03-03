// Scheduled Edge Function — run via pg_cron or Supabase scheduled functions
// Checks payment records for the current month and sends reminders
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

serve(async () => {
  const month = getCurrentMonth()

  // Get all active members
  const { data: members, error: membersErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('status', 'active')

  if (membersErr) return new Response(JSON.stringify({ error: membersErr.message }), { status: 500 })

  // Get paid members this month
  const { data: paid } = await supabase
    .from('payment_records')
    .select('user_id')
    .eq('month', month)
    .eq('status', 'paid')

  const paidIds = new Set(paid?.map((p) => p.user_id) ?? [])
  const unpaid = members?.filter((m) => !paidIds.has(m.id)) ?? []

  // Send reminder notification to each unpaid member
  const notifications = unpaid.map((m) => ({
    user_id: m.id,
    type: 'payment_reminder' as const,
    title: 'Kontingentpåmindelse',
    message: `Dit kontingent for ${month} er endnu ikke registreret.`,
    link: '/treasury',
  }))

  if (notifications.length > 0) {
    const { error: notifErr } = await supabase.from('notifications').insert(notifications)
    if (notifErr) return new Response(JSON.stringify({ error: notifErr.message }), { status: 500 })
  }

  return new Response(
    JSON.stringify({ month, reminders_sent: notifications.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
