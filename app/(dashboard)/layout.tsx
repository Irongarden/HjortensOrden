import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import type { Profile } from '@/lib/types'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

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

  // Use the service-role admin client for all data fetching here.
  // This bypasses RLS and is not affected by the user's JWT expiry.
  // We already verified identity above via getUser(), so it's safe.
  const admin = createAdminClient()
  const queryClient = new QueryClient()

  const [{ data: profile }] = await Promise.all([
    // Current user profile
    admin.from('profiles').select('*').eq('id', user.id).single(),

    // Members list — dashboard stats, map, treasury, hierarchy, etc.
    queryClient.prefetchQuery({
      queryKey: ['members'],
      queryFn: async () => {
        const { data } = await admin.from('profiles').select('*').order('full_name')
        return data ?? []
      },
    }),

    // Upcoming events — dashboard card + events page
    queryClient.prefetchQuery({
      queryKey: ['events', 'upcoming', 5],
      queryFn: async () => {
        const { data } = await admin
          .from('events')
          .select('*, participants:event_participants(id, user_id, rsvp, responded_at, profile:profiles(id, full_name, avatar_url))')
          .gte('starts_at', new Date().toISOString())
          .eq('status', 'published')
          .order('starts_at')
          .limit(5)
        return data ?? []
      },
    }),
  ])

  return (
    // Only dehydrate successful queries — never cache server-side errors
    <HydrationBoundary state={dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    })}>
      <AppShell initialProfile={(profile as Profile) ?? null}>{children}</AppShell>
    </HydrationBoundary>
  )
}
