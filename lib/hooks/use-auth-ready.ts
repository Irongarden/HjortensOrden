'use client'

import { useAuthStore } from '@/lib/stores/auth-store'

/**
 * Returns true once the auth bootstrap is complete — i.e. AppShell's
 * useLayoutEffect has run (or AuthProvider's loadFromSession has completed
 * as a fallback). This signals that the Supabase browser client's session
 * is initialised and queries can fire safely.
 *
 * IMPORTANT: This is NOT "is the user logged in" — it just means the auth
 * bootstrap has finished. Profile may still be null (e.g. no profile row).
 * Queries gated by this flag will fire, but RLS will handle authorisation.
 */
export function useAuthReady() {
  return useAuthStore((s) => s.isBootstrapped)
}
