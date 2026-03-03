'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calendar, BookOpen, Image, Users,
  CheckSquare, Wallet, Sparkles, Crown, X, ChevronRight,
  Shield, ScrollText, ChevronLeft, Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useUIStore } from '@/lib/stores/ui-store'
import { useNotifications } from '@/lib/hooks/use-members'
import { Avatar } from '@/components/ui/avatar'
import { ROLE_LABELS } from '@/lib/rbac'
import type { MemberRole } from '@/lib/types'

// ── Mobile Bottom Navigation ─────────────────────────────────────────────────
export function MobileBottomNav() {
  const pathname = usePathname()
  const { setSidebarOpen } = useUIStore()
  const { data: notifications = [] } = useNotifications()
  const unreadCount = notifications.filter((n) => !n.read).length

  const items = [
    { label: 'Hjem',      href: '/dashboard',   icon: LayoutDashboard },
    { label: 'Kalender',  href: '/events',       icon: Calendar },
    { label: 'Tidslinje', href: '/timeline',     icon: BookOpen },
    { label: 'Galleri',   href: '/gallery',      icon: Image },
    { label: 'Menu',      href: null,            icon: Menu },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-charcoal/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-stretch h-14">
        {items.map((item) => {
          if (!item.href) {
            // "Mere" opens drawer
            return (
              <button
                key="mere"
                onClick={() => setSidebarOpen(true)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted hover:text-parchment transition-colors"
              >
                <item.icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          }
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                isActive ? 'text-gold' : 'text-muted hover:text-parchment',
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Kalender',       href: '/events',        icon: Calendar },
  { label: 'Tidslinje',      href: '/timeline',      icon: BookOpen },
  { label: 'Galleri',        href: '/gallery',       icon: Image },
  { label: 'Hierarki',       href: '/hierarchy',     icon: Crown },
  { label: 'Afstemninger',   href: '/polls',         icon: CheckSquare },
  { label: 'Kasserer',       href: '/treasury',      icon: Wallet,    roles: ['admin','chairman','vice_chairman','treasurer'] as MemberRole[] },
  { label: 'Planlægning',    href: '/inspiration',   icon: Sparkles },
  { label: 'Vedtægter',      href: '/vedtaegter',    icon: ScrollText },
  { label: 'Medlemmer',      href: '/members',       icon: Users,     roles: ['admin','chairman','vice_chairman'] as MemberRole[] },
  { label: 'Administration', href: '/admin',         icon: Shield,    roles: ['admin'] as MemberRole[] },
]

function SidebarContent({ collapsed, onNavClick }: { collapsed: boolean; onNavClick?: () => void }) {
  const pathname = usePathname()
  const { profile } = useAuthStore()
  const { toggleSidebar } = useUIStore()

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true
    if (!profile) return false
    return item.roles.includes(profile.role as MemberRole)
  })

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'border-b border-border flex-shrink-0 transition-all duration-300',
        collapsed ? 'p-3 flex items-center justify-center' : 'px-4 py-4',
      )}>
        <Link
          href="/dashboard"
          onClick={onNavClick}
          className="flex items-center gap-3 overflow-hidden"
          title={collapsed ? 'Hjortens Orden' : undefined}
        >
          <img
            src="/HOLogoTransparent.png"
            alt="Hjortens Orden"
            className="w-11 h-11 object-contain flex-shrink-0"
          />
          {!collapsed && (
            <p className="font-serif text-parchment font-semibold text-sm leading-tight whitespace-nowrap">
              Hjortens Orden
            </p>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-3 space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
        {visibleNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              title={collapsed ? item.label : undefined}
              className={cn(
                'relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 group',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? cn('text-gold bg-gold/8', !collapsed && 'border-l-2 border-gold')
                  : cn('text-muted hover:text-parchment hover:bg-surface/60', !collapsed && 'border-l-2 border-transparent'),
              )}
            >
              {collapsed && isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gold rounded-r-full" />
              )}
              <Icon
                size={18}
                className={cn('flex-shrink-0', isActive ? 'text-gold' : 'text-muted group-hover:text-parchment')}
              />
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-gold/60" />}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Profile Section */}
      {profile && (
        <div className={cn(
          'border-t border-border flex-shrink-0',
          collapsed ? 'p-2 flex items-center justify-center' : 'px-3 py-2',
        )}>
          <Link
            href="/profile"
            onClick={onNavClick}
            title={collapsed ? profile.full_name : undefined}
            className={cn(
              'flex items-center rounded-lg hover:bg-surface/60 transition-colors group',
              collapsed ? 'p-2' : 'gap-3 p-2',
            )}
          >
            <Avatar src={profile.avatar_url} name={profile.full_name} size="sm" ring />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-parchment truncate">{profile.full_name}</p>
                <p className="text-xs text-muted">{ROLE_LABELS[profile.role as MemberRole]}</p>
              </div>
            )}
          </Link>
        </div>
      )}

      {/* Collapse toggle */}
      <div className={cn(
        'border-t border-border/30 flex-shrink-0 py-1.5',
        collapsed ? 'flex items-center justify-center' : 'px-4 flex justify-end',
      )}>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-muted/60 hover:text-parchment hover:bg-surface/60 transition-colors"
          title={collapsed ? 'Udvid menu' : 'Skjul menu'}
        >
          <ChevronLeft size={14} className={cn('transition-transform duration-300', collapsed && 'rotate-180')} />
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-full z-30',
          'bg-charcoal border-r border-border',
          'transition-all duration-300 ease-out-expo',
          sidebarOpen ? 'w-sidebar' : 'w-16',
        )}
      >
        <SidebarContent collapsed={!sidebarOpen} />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed left-0 top-0 h-full w-sidebar bg-charcoal border-r border-border z-50"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-md text-muted hover:text-parchment"
              >
                <X size={18} />
              </button>
              <SidebarContent collapsed={false} onNavClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
