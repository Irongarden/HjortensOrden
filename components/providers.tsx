'use client'

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
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
        // Skip if AppShell's useLayoutEffect already set a real profile from the
        // server. isLoading starts as false in the store, so the only meaningful
        // check is whether profile has been confirmed. useLayoutEffect always runs
        // before this useEffect, so if initialProfile was non-null it's already set.
        if (useAuthStore.getState().profile !== null) return

        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (mounted) setProfile(data as Profile)
        } else {
          if (mounted) setProfile(null)
        }
      } catch {
        if (mounted) setProfile(null)
      }
    }

    loadFromSession()

    // ── Step 2: Listen for subsequent auth state changes (sign-in, sign-out,
    // token refresh). Skip INITIAL_SESSION — already handled above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return
        if (!mounted) return
        // On sign-out, wipe React Query cache so no stale data leaks to next user
        if (event === 'SIGNED_OUT') {
          queryClient.clear()
          if (mounted) setProfile(null)
          return
        }
        try {
          if (session?.user) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            if (mounted) setProfile(data as Profile)
          } else {
            if (mounted) setProfile(null)
          }
        } catch {
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
            retry: 3,
            retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 8000),
            refetchOnWindowFocus: false,
          },
        },
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
