import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ClientShell } from '@/components/layout/client-shell'
import type { Profile } from '@/lib/types'

/**
 * Dashboard layout — server side only does:
 * 1. Auth guard (redirect to /login if not authenticated)
 * 2. Profile fetch (passed as prop so the shell has it immediately on mount)
 *
 * Everything else — AppShell, Sidebar, Topbar, page content — is rendered
 * client-side only via ClientShell (dynamic ssr:false).  This eliminates all
 * React hydration errors (#422) that were caused by Zustand store values
 * differing between the server-side singleton and the fresh client state.
 */
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

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <ClientShell initialProfile={(profile as Profile) ?? null}>
      {children}
    </ClientShell>
  )
}
