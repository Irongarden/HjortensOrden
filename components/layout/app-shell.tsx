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

  // Bootstrap auth store synchronously from server-provided profile data.
  // useLayoutEffect runs before the browser paints AND before useEffect
  // (where AuthProvider fires its session fetch), so components always see a
  // valid profile from the very first paint.
  // NOTE: isLoading starts as false in the store — no need to flip it here.
  useLayoutEffect(() => {
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
