'use client'

// Module-level diagnostic - runs immediately when this chunk loads in the browser,
// BEFORE any React rendering or hydration. If this never appears in console it
// means an old cached JS bundle is being served (service worker or HTTP cache).
console.log('[v5] providers.tsx loaded')

import { QueryClient, QueryClientProvider, QueryCache, useQueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Profile } from '@/lib/types'

// Stable module-level Supabase client - never recreated
const supabase = createClient()

function AuthProvider({ children }: { children: React.ReactNode }) {
  const setProfile = useAuthStore((s) => s.setProfile)
  const queryClient = useQueryClient()

  useEffect(() => {
    let mounted = true
    let bootstrappedByEvent = false

    // onAuthStateChange is the single source of truth for auth state.
    //
    // WHY: on refresh, Supabase may refresh the JWT token at the exact same
    // moment getSession() is called. During that window getSession() can return
    // null, causing setProfile(null) + isBootstrapped:true, triggering React
    // Query with no token -> RLS returns empty -> data disappears.
    //
    // Fix: bootstrap entirely from onAuthStateChange events:
    //  - INITIAL_SESSION fires first with the real session -> bootstrap here.
    //  - SIGNED_IN / TOKEN_REFRESHED fires when token refreshes -> invalidate
    //    all queries so they re-run with the fresh token.
    //  - SIGNED_OUT -> clear everything.
    // getSession() fallback only used if INITIAL_SESSION never fires (offline).

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange:', event, session ? 'user=' + session.user.id : 'null')
        if (!mounted) return

        if (event === 'SIGNED_OUT') {
          bootstrappedByEvent = true
          queryClient.clear()
          if (mounted) {
            setProfile(null)
            useAuthStore.setState({ isBootstrapped: true })
          }
          return
        }

        if (event === 'INITIAL_SESSION') {
          bootstrappedByEvent = true
          // Enable queries immediately — do not block on the profile fetch.
          if (mounted) useAuthStore.setState({ isBootstrapped: true })
          if (session?.user) {
            // AppShell enables queries from the server-rendered profile BEFORE
            // this event fires. Those early queries can race ahead of the
            // browser supabase client finishing its session hydration and go
            // out without the user's auth header -> RLS returns empty -> React
            // Query caches an empty "success". INITIAL_SESSION is the first
            // point where the client session is guaranteed ready, so we
            // invalidate here to force any such queries to refetch WITH the
            // token. React Query dedupes in-flight fetches, so in the happy
            // path this is at most one cheap refetch. This is what fixes the
            // production "must refresh several times before data appears" bug.
            //
            // CRITICAL: do NOT call supabase.from()/invalidateQueries
            // synchronously inside this callback. @supabase/ssr holds an
            // internal lock for the duration of the onAuthStateChange callback;
            // a re-entrant supabase query deadlocks it forever (the
            // "Indlæser… i en evighed" hang). Defer with setTimeout(0) so the
            // callback returns and the lock releases first.
            const userId = session.user.id
            const needsProfile = !useAuthStore.getState().profile
            setTimeout(async () => {
              if (!mounted) return
              if (needsProfile && !useAuthStore.getState().profile) {
                try {
                  const { data, error: profileErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single()
                  if (profileErr) console.error('[Auth] profile fetch error (INITIAL_SESSION):', profileErr)
                  console.log('[Auth] profile (INITIAL_SESSION):', data ? (data as Profile).id : 'null')
                  if (mounted && data) setProfile(data as Profile)
                } catch (e) {
                  console.error('[Auth] INITIAL_SESSION profile fetch threw:', e)
                }
              }
              if (mounted) {
                console.log('[Auth] INITIAL_SESSION: invalidating queries with confirmed session')
                queryClient.invalidateQueries()
              }
            }, 0)
          } else {
            // Session is null — token is mid-refresh. Do NOT call setProfile(null) here:
            // AppShell may have already set a valid profile from the server-side fetch.
            // SIGNED_IN will fire shortly with the refreshed token and update everything.
            console.log('[Auth] INITIAL_SESSION: null session — skipping setProfile, awaiting SIGNED_IN')
          }
          return
        }

        // SIGNED_IN / TOKEN_REFRESHED — token refresh is complete.
        // The `session` parameter IS the confirmed new session.
        //
        // CRITICAL: do NOT call supabase.auth.getSession() or supabase.from()
        // here. @supabase/ssr holds an internal lock during the entire
        // onAuthStateChange callback. Any re-entrant supabase call will
        // deadlock (no error, no timeout, promise never resolves).
        //
        // Strategy:
        //  1. Set bootstrappedByEvent to suppress the 3s fallback.
        //  2. Yield with setTimeout(0) — the callback returns, lock releases.
        //  3. Set isBootstrapped:true — queries become enabled.
        //  4. invalidateQueries() — React Query refetches with the new token.
        bootstrappedByEvent = true
        console.log('[Auth] SIGNED_IN: yielding so lock releases...')
        await new Promise<void>((r) => setTimeout(r, 0))
        if (!mounted) return
        useAuthStore.setState({ isBootstrapped: true })
        console.log('[Auth] SIGNED_IN: isBootstrapped set, calling invalidateQueries')
        await queryClient.invalidateQueries()
      }
    )

    // Fallback: if INITIAL_SESSION never fires (offline / init failure),
    // bootstrap from getSession() after a short delay.
    const fallbackTimer = setTimeout(async () => {
      if (!mounted || bootstrappedByEvent) return
      console.log('[Auth] fallback - INITIAL_SESSION never fired, calling getSession()')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          const { data } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single()
          if (mounted) {
            setProfile(data as Profile)
            queryClient.invalidateQueries()
          }
        } else {
          if (mounted) setProfile(null)
        }
      } catch (e) {
        console.error('[Auth] fallback getSession threw:', e)
        if (mounted) setProfile(null)
      } finally {
        if (mounted) useAuthStore.setState({ isBootstrapped: true })
      }
    }, 3000)

    return () => {
      mounted = false
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [setProfile, queryClient])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 2,
            retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 8000),
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({
          onError: (error: unknown, query) => {
            console.error('[Query] error for key', query.queryKey, '-', error)
            const msg = error instanceof Error ? error.message : 'Ukendt fejl'
            toast.error('Data kunne ikke hentes - ' + msg, {
              id: String(query.queryHash),
              duration: 6000,
            })
          },
        }),
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1c2028',
              color: '#e8e0d0',
              border: '1px solid #2e3540',
              borderRadius: '8px',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: '#1a7a49', secondary: '#e8e0d0' },
            },
            error: {
              iconTheme: { primary: '#dc2626', secondary: '#e8e0d0' },
            },
          }}
        />
      </AuthProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}
