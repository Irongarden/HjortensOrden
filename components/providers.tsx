'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    let mounted = true

    // Safety-net: if onAuthStateChange never fires (rare edge case), stop spinning
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 10_000)

    // Single auth path — INITIAL_SESSION fires immediately from localStorage,
    // so no duplicate network calls racing each other.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(timeout)
        if (!mounted) return
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
        } finally {
          if (mounted) setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [setProfile, setLoading])

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
