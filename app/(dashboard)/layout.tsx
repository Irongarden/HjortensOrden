import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  // Prefetch the most-used data server-side and inject it into the client's
  // React Query cache via HydrationBoundary. This means components never show
  // a loading state on first render — data is already there.
  const queryClient = new QueryClient()

  const [{ data: profile }] = await Promise.all([
    // Current user profile
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    // Members list — dashboard stats, map, treasury, hierarchy, etc.
    queryClient.prefetchQuery({
      queryKey: ['members'],
      queryFn: async () => {
        const { data } = await supabase.from('profiles').select('*').order('full_name')
        return data ?? []
      },
    }),

    // Upcoming events — dashboard card + events page
    queryClient.prefetchQuery({
      queryKey: ['events', 'upcoming', 5],
      queryFn: async () => {
        const { data } = await supabase
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
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppShell initialProfile={(profile as Profile) ?? null}>{children}</AppShell>
    </HydrationBoundary>
  )
}
