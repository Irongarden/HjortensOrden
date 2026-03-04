'use client'

import { useAuthStore } from '@/lib/stores/auth-store'

/**
 * Returns true once the auth bootstrap is complete — i.e. the server-side
 * profile has been injected into the Zustand store via AppShell's useLayoutEffect.
 *
 * Checking `profile !== null` (not `!isLoading`) is the correct signal:
 * - `isLoading` was removed as a meaningful flag (it stays false).
 * - `profile` is set synchronously by useLayoutEffect before the first browser
 *   paint, so queries don't delay visually but they also don't race against
 *   an uninitialised Supabase session and cache empty results via RLS.
 * - HydrationBoundary cached queries (e.g. ['members']) are served from cache
 *   regardless of `enabled`, so they are unaffected.
 */
export function useAuthReady() {
  return useAuthStore((s) => s.profile !== null)
}
