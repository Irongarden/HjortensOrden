'use client'

import { useAuthStore } from '@/lib/stores/auth-store'

/**
 * Returns true once the auth bootstrap is complete — i.e. the server-side
 * profile has been injected into the Zustand store via AppShell's useLayoutEffect.
 *
 * Use this as the `enabled` flag on every React Query useQuery() call so that
 * queries never fire before the Supabase session is confirmed, preventing
 * empty results from being cached with staleTime.
 */
export function useAuthReady() {
  return !useAuthStore((s) => s.isLoading)
}
