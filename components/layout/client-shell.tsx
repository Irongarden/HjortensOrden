'use client'

/**
 * Thin client-only wrapper that loads AppShell with ssr:false.
 *
 * Why: AppShell (and its children Sidebar/Topbar) reads from Zustand stores
 * whose initial values must match between server and client.  The stores are
 * module-level singletons in Node.js, which means a previous request can leave
 * them in a mutated state that differs from the client's initial state →
 * React #422 hydration error.
 *
 * By loading via dynamic({ ssr: false }) we opt the entire shell out of
 * server-side rendering.  The server only outputs the bare document structure;
 * the shell (sidebar, topbar) and all page content are rendered purely on the
 * client where store state is always fresh and consistent.
 */

import dynamic from 'next/dynamic'
import type { Profile } from '@/lib/types'

const AppShell = dynamic(
  () => import('./app-shell').then((m) => m.AppShell),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    ),
  },
)

export function ClientShell({
  children,
  initialProfile,
}: {
  children: React.ReactNode
  initialProfile: Profile | null
}) {
  return <AppShell initialProfile={initialProfile}>{children}</AppShell>
}
