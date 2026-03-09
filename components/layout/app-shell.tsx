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
  // We do NOT set isBootstrapped here — that is exclusively controlled by
  // AuthProvider after it has confirmed the token is valid via an auth event.
  // Setting isBootstrapped too early (before onAuthStateChange settles) causes
  // queries to fire with a mid-refresh token, getting empty RLS responses.
  useLayoutEffect(() => {
    console.log('[AppShell] bootstrap — initialProfile:', initialProfile ? initialProfile.id : 'null')
    useAuthStore.setState({ profile: initialProfile ?? null })
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
