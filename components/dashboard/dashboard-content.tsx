'use client'

import { motion } from 'framer-motion'
import {
  CalendarDays, TrendingUp, CheckSquare,
  Award, Users, Vote,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useUpcomingEvents } from '@/lib/hooks/use-events'
import { useActivePoll } from '@/lib/hooks/use-polls'
import { useTreasuryBalance } from '@/lib/hooks/use-treasury'
import { useMembers } from '@/lib/hooks/use-members'
import { StatCard } from '@/components/ui/card'
import { UpcomingEventsCard } from './upcoming-events-card'
import { InProgressProposalsCard } from './in-progress-proposals-card'
import { ActivePollCard } from './active-poll-card'
import { ActivityFeed } from './activity-feed'
import { AnniversaryCard } from './anniversary-card'
import { formatDKK, getMembershipYears } from '@/lib/utils'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { ease: [0.19, 1, 0.22, 1], duration: 0.4 } },
}

export function DashboardContent() {
  const { profile, can } = useAuthStore()
  const { data: events, isLoading: eventsLoading } = useUpcomingEvents(5)
  const { data: activePoll } = useActivePoll()
  const { data: treasury } = useTreasuryBalance()
  const { data: members } = useMembers()

  const activeMembers = members?.filter((m) => m.status === 'active') ?? []
  const isTreasurer = can('view_treasury')
  const isLeadership = can('manage_members')

  // Upcoming anniversaries (members whose join anniversary is within 30 days)
  const today = new Date()
  const upcomingAnniversaries = activeMembers
    .map((m) => {
      const joined = new Date(m.joined_at)
      const thisYearAnniversary = new Date(today.getFullYear(), joined.getMonth(), joined.getDate())
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(today.getFullYear() + 1)
      }
      const daysUntil = Math.round((thisYearAnniversary.getTime() - today.getTime()) / 86400000)
      return { profile: m, years: getMembershipYears(m.joined_at) + 1, daysUntil, anniversary_date: thisYearAnniversary.toISOString() }
    })
    .filter((a) => a.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3)

  const hour = today.getHours()
  const greeting = hour < 12 ? 'Godmorgen' : hour < 18 ? 'Goddag' : 'Godaften'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  // My attendance (upcoming events count where I'm attending)
  const myAttendance = events?.filter((e) =>
    e.participants?.find((p) => p.user_id === profile?.id && p.rsvp === 'attending')
  ).length ?? 0

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={item} className="flex items-end justify-between">
        <div>
          <p className="text-label-sm text-muted uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="font-serif text-display-md text-parchment">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted mt-1">Velkommen til Hjortens Orden</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-forest animate-pulse" />
          <span className="text-xs text-muted">{activeMembers.length} aktive medlemmer</span>
        </div>
      </motion.div>

      {/* Ornamental divider */}
      <motion.div variants={item} className="ornament">
        <span>Ordensoversigt</span>
      </motion.div>

      {/* Stats Grid — role-aware */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isTreasurer && (
          <StatCard
            label="Kassebeholdning"
            value={treasury ? formatDKK(treasury.balance) : '—'}
            subtext="Aktuel saldo"
            icon={<TrendingUp size={20} />}
            trend={treasury && treasury.balance > 0 ? { value: 0, label: '' } : undefined}
            href="/treasury"
          />
        )}
        {isLeadership && (
          <StatCard
            label="Aktive Medlemmer"
            value={activeMembers.length}
            subtext="Registrerede ordensmænd"
            icon={<Users size={20} />}
            href="/members"
          />
        )}
        <StatCard
          label="Kommende Begivenheder"
          value={eventsLoading ? '…' : events?.length ?? 0}
          subtext="Planlagte arrangementer"
          icon={<CalendarDays size={20} />}
          href="/events"
        />
        <StatCard
          label={activePoll ? 'Aktiv Afstemning' : 'Afstemninger'}
          value={activePoll ? '1 aktiv' : '0 aktive'}
          subtext={activePoll ? activePoll.title : 'Ingen aktive afstemninger'}
          icon={<Vote size={20} />}
          href="/polls"
        />
        {!isTreasurer && (
          <StatCard
            label="Mine tilmeldinger"
            value={myAttendance}
            subtext="Kommende begivenheder"
            icon={<CheckSquare size={20} />}
            href="/events"
          />
        )}
        {!isLeadership && (
          <StatCard
            label="Anciennitet"
            value={profile?.joined_at ? `${getMembershipYears(profile.joined_at)} år` : '—'}
            subtext="Medlem siden indmeldelse"
            icon={<Award size={20} />}
            href="/profile"
          />
        )}
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Poll — shown first for regular members */}
          {activePoll && (
            <motion.div variants={item}>
              <ActivePollCard poll={activePoll} />
            </motion.div>
          )}

          {/* Upcoming Events — compact multi-event list with inline RSVP */}
          <motion.div variants={item}>
            <UpcomingEventsCard events={events ?? []} isLoading={eventsLoading} />
          </motion.div>

          {/* In-progress proposals quick-access */}
          <motion.div variants={item}>
            <InProgressProposalsCard />
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={item}>
            <ActivityFeed />
          </motion.div>
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-6">
          {/* Anniversaries */}
          {upcomingAnniversaries.length > 0 && (
            <motion.div variants={item}>
              <AnniversaryCard anniversaries={upcomingAnniversaries} />
            </motion.div>
          )}

          {/* Member Badges */}
          <motion.div variants={item}>
            <div className="bg-charcoal border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-heading-sm text-parchment">Seneste Fortjenester</h3>
                <Award size={16} className="text-gold/60" />
              </div>
              <p className="text-sm text-muted">
                Badges tildeles automatisk ved jubilæer og særlige bedrifter.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
