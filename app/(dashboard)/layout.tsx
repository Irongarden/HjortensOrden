import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import type { Profile } from '@/lib/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the profile server-side so the client receives it instantly —
  // no async getSession() + extra round-trip needed on the client.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <AppShell initialProfile={(profile as Profile) ?? null}>{children}</AppShell>
}
