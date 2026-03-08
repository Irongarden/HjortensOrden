'use client'

/**
 * Thin client-only wrapper for AppShell.
 *
 * WHY mounted guard instead of dynamic(ssr:false):
 * dynamic(ssr:false) with a loading fallback still server-renders the fallback
 * HTML. If the AppShell JS chunk is already in the browser's HTTP cache from a
 * previous visit, React.lazy resolves it synchronously during hydration — React
 * then sees server=loading-spinner vs client=actual-AppShell → hydration mismatch
 * → React error #422 → entire tree re-renders from scratch → queries fire before
 * auth is bootstrapped → data appears to disappear on every refresh.
 *
 * With a mounted guard: server renders null, client ALSO renders null during the
 * hydration pass (useState initial value). After the first useEffect, mounted=true
 * and AppShell renders normally. Server and client always agree during hydration.
 */

import { useState, useEffect } from 'react'
import { AppShell } from './app-shell'
import type { Profile } from '@/lib/types'

export function ClientShell({
  children,
  initialProfile,
}: {
  children: React.ReactNode
  initialProfile: Profile | null
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and the initial client hydration pass, render nothing.
  // This guarantees server HTML === client virtual DOM → no #422.
  if (!mounted) return null

  return <AppShell initialProfile={initialProfile}>{children}</AppShell>
}

