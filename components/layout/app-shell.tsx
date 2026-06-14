'use client'

import { useLayoutEffect } from 'react'
import { Sidebar, MobileBottomNav } from './sidebar'
import { Topbar } from './topbar'
import { CommandSearch } from '@/components/shared/command-search'
import { useUIStore } from '@/lib/stores/ui-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'

export function AppShell({ children, initialProfile }: { children: React.ReactNode; initialProfile?: Profile | null }) {
  const { sidebarOpen } = useUIStore()

  // Set the profile from the server-side fetch so Sidebar/Topbar render
  // immediately with the correct user name and avatar.
  //
  // We deliberately do NOT set isBootstrapped here. Enabling queries before
  // the browser supabase client has confirmed its session (the INITIAL_SESSION
  // / SIGNED_IN event in AuthProvider) lets queries fire without an auth header
  // -> RLS returns empty -> empty data gets cached, which on production cold
  // loads showed up as "must refresh several times before data appears".
  // AuthProvider flips isBootstrapped only once a session is confirmed, so the
  // first query is always authenticated. The profile below is purely for
  // instant display and does not gate any queries.
  useLayoutEffect(() => {
    console.log('[AppShell] bootstrap — initialProfile:', initialProfile ? initialProfile.id : 'null')
    if (initialProfile) {
      useAuthStore.setState({ profile: initialProfile })
    } else {
      useAuthStore.setState({ profile: null })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-obsidian">
      <Sidebar />
      <Topbar />
      <MobileBottomNav />
      <CommandSearch />
      <main
        className={cn(
          'min-h-screen pt-16 pb-14 lg:pb-0 transition-all duration-300 ease-out-expo',
          sidebarOpen ? 'lg:pl-sidebar' : 'lg:pl-16',
        )}
      >
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
