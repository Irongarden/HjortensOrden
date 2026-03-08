'use client'

// Module-level diagnostic — runs immediately when this chunk loads in the browser,
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

// Stable module-level Supabase client — never recreated
const supabase = createClient()

function AuthProvider({ children }: { children: React.ReactNode }) {
  const setProfile = useAuthStore((s) => s.setProfile)
  const queryClient = useQueryClient()

  useEffect(() => {
    let mounted = true

    // ── Step 1: Read session from cookie storage.
    // Runs only when AppShell couldn’t set a profile (server fetch failed).
    // If profile is already set via useLayoutEffect, we skip immediately.
    async function loadFromSession() {
      try {
        const alreadyBootstrapped = useAuthStore.getState().isBootstrapped
        console.log('[Auth] loadFromSession — isBootstrapped:', alreadyBootstrapped)
        if (alreadyBootstrapped) return

        const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr) console.error('[Auth] getSession error:', sessionErr)
        console.log('[Auth] session:', session ? `user=${session.user.id}` : 'null')
        if (!mounted) return
        if (session?.user) {
          const { data, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (profileErr) console.error('[Auth] profile fetch error:', profileErr)
          console.log('[Auth] profile:', data ? (data as Profile).id : 'null')
          if (mounted) setProfile(data as Profile)
        } else {
          if (mounted) setProfile(null)
        }
      } catch (e) {
        console.error('[Auth] loadFromSession threw:', e)
        if (mounted) setProfile(null)
      } finally {
        console.log('[Auth] bootstrap complete')
        if (mounted) useAuthStore.setState({ isBootstrapped: true })
      }
    }

    loadFromSession()

    // ── Step 2: Listen for subsequent auth state changes (sign-in, sign-out,
    // token refresh). Skip INITIAL_SESSION — already handled above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange:', event, session ? `user=${session.user.id}` : 'null')
        if (event === 'INITIAL_SESSION') return
        if (!mounted) return
        if (event === 'SIGNED_OUT') {
          queryClient.clear()
          if (mounted) setProfile(null)
          return
        }
        try {
          if (session?.user) {
            const { data, error: profileErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            if (profileErr) console.error('[Auth] profile re-fetch error:', profileErr)
            console.log('[Auth] profile refreshed:', data ? (data as Profile).id : 'null')
            if (mounted) setProfile(data as Profile)
          } else {
            if (mounted) setProfile(null)
          }
        } catch (e) {
          console.error('[Auth] onAuthStateChange threw:', e)
          if (mounted) setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
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
            console.error('[Query] error for key', query.queryKey, '—', error)
            const msg = error instanceof Error ? error.message : 'Ukendt fejl'
            toast.error(`Data kunne ikke hentes — ${msg}`, {
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
