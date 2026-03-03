'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, Search, Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { cn, formatRelative } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useUIStore } from '@/lib/stores/ui-store'
import { useNotifications, useMarkAllNotificationsRead } from '@/lib/hooks/use-members'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'

export function Topbar() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { toggleSidebar, setCommandOpen, sidebarOpen } = useUIStore()
  const { data: notifications = [] } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const supabase = createClient()

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Du er nu logget ud')
    router.push('/login')
  }

  return (
    <header className={cn(
      'fixed top-0 right-0 left-0 h-16 z-20',
      'bg-charcoal/95 backdrop-blur-sm border-b border-border',
      'flex items-center justify-between px-4 lg:px-6',
      sidebarOpen ? 'lg:left-sidebar' : 'lg:left-16',
    )}>
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-2 rounded-lg text-muted hover:text-parchment hover:bg-surface/60
                     transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Mobile logo */}
        <Link href="/dashboard" className="lg:hidden flex items-center justify-center h-16">
          <img src="/HOLogoTransparent.png" alt="Hjortens Orden" className="w-12 h-12 object-contain" />
        </Link>

        {/* Global Search Trigger */}
        <button
          onClick={() => setCommandOpen(true)}
          className="hidden sm:flex items-center gap-2.5 px-3 py-2 rounded-lg bg-obsidian
                     border border-border text-muted text-sm hover:border-gold/30
                     hover:text-parchment/70 transition-all w-56"
        >
          <Search size={14} />
          <span>Søg…</span>
          <kbd className="ml-auto text-[10px] text-muted/60 border border-border rounded px-1">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
            className="p-2 rounded-lg text-muted hover:text-parchment hover:bg-surface/60
                       transition-colors relative"
            aria-label="Notifikationer"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-gold rounded-full
                               ring-2 ring-charcoal animate-pulse-gold" />
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-96 bg-charcoal border border-border
                           rounded-xl shadow-modal overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-serif text-sm text-parchment">Notifikationer</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-xs text-gold hover:text-gold/80 transition-colors"
                    >
                      Marker alle som læst
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted text-sm">
                      Ingen notifikationer
                    </div>
                  ) : (
                    notifications.slice(0, 15).map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          'px-4 py-3 hover:bg-surface/40 transition-colors border-b border-border/50 last:border-0',
                          !notif.read && 'bg-gold/3'
                        )}
                      >
                        {!notif.read && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold mr-2 mb-0.5" />
                        )}
                        <p className="text-sm text-parchment font-medium">{notif.title}</p>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-muted/60 mt-1">{formatRelative(notif.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <Link
                    href="/notifications"
                    className="text-xs text-gold hover:text-gold/80 transition-colors"
                    onClick={() => setNotifOpen(false)}
                  >
                    Se alle notifikationer →
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg
                       hover:bg-surface/60 transition-colors"
          >
            {profile && (
              <Avatar src={profile.avatar_url} name={profile.full_name} size="sm" />
            )}
            <span className="hidden md:block text-sm text-parchment/80 font-medium max-w-[120px] truncate">
              {profile?.full_name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} className="text-muted hidden md:block" />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-52 bg-charcoal border border-border
                           rounded-xl shadow-modal overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-parchment">{profile?.full_name}</p>
                  <p className="text-xs text-muted">{profile?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted
                               hover:text-parchment hover:bg-surface/40 transition-colors"
                  >
                    <User size={16} />
                    Min profil
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                               text-red-400 hover:text-red-300 hover:bg-red-900/10
                               transition-colors"
                  >
                    <LogOut size={16} />
                    Log ud
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Click-outside overlay */}
      {(notifOpen || profileOpen) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => { setNotifOpen(false); setProfileOpen(false) }}
        />
      )}
    </header>
  )
}
