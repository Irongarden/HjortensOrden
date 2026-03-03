import { cn } from '@/lib/utils'
import { MemberRole, MemberStatus, RSVPStatus, PaymentStatus, EventStatus, PollStatus } from '@/lib/types'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/rbac'

// ── Generic Badge ──────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  className?: string
  dot?: boolean
}

export function Badge({ children, className, dot }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-medium',
      className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

// ── Role Badge ─────────────────────────────────────────
export function RoleBadge({ role, className }: { role: MemberRole; className?: string }) {
  return (
    <Badge className={cn('border', ROLE_COLORS[role], className)}>
      {ROLE_LABELS[role]}
    </Badge>
  )
}

// ── Member Status Badge ────────────────────────────────
export function StatusBadge({ status }: { status: MemberStatus }) {
  const styles: Record<MemberStatus, string> = {
    active:      'text-forest-400 bg-forest-900/20 border-forest-800/30',
    suspended:   'text-amber-400 bg-amber-900/20 border-amber-800/30',
    deactivated: 'text-red-400 bg-red-900/20 border-red-800/30',
    pending:     'text-blue-400 bg-blue-900/20 border-blue-800/30',
  }
  const labels: Record<MemberStatus, string> = {
    active: 'Aktiv', suspended: 'Suspenderet', deactivated: 'Deaktiveret', pending: 'Afventer',
  }
  return <Badge className={cn('border', styles[status])} dot>{labels[status]}</Badge>
}

// ── RSVP Badge ─────────────────────────────────────────
export function RSVPBadge({ rsvp }: { rsvp: RSVPStatus }) {
  const styles: Record<RSVPStatus, string> = {
    attending:     'text-forest-400 bg-forest-900/20 border-forest-800/30',
    maybe:         'text-amber-400 bg-amber-900/20 border-amber-800/30',
    not_attending: 'text-red-400 bg-red-900/20 border-red-800/30',
  }
  const labels: Record<RSVPStatus, string> = {
    attending: 'Deltager', maybe: 'Måske', not_attending: 'Deltager ikke',
  }
  return <Badge className={cn('border', styles[rsvp])} dot>{labels[rsvp]}</Badge>
}

// ── Payment Status Badge ───────────────────────────────
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    paid:    'text-forest-400 bg-forest-900/20 border-forest-800/30',
    pending: 'text-amber-400 bg-amber-900/20 border-amber-800/30',
    overdue: 'text-red-400 bg-red-900/20 border-red-800/30',
  }
  const labels: Record<PaymentStatus, string> = {
    paid: 'Betalt', pending: 'Afventer', overdue: 'Forsinket',
  }
  return <Badge className={cn('border', styles[status])} dot>{labels[status]}</Badge>
}

// ── Event Status Badge ─────────────────────────────────
export function EventStatusBadge({ status }: { status: EventStatus }) {
  const styles: Record<EventStatus, string> = {
    draft:     'text-muted bg-surface border-border',
    published: 'text-forest-400 bg-forest-900/20 border-forest-800/30',
    cancelled: 'text-red-400 bg-red-900/20 border-red-800/30',
    completed: 'text-gold bg-gold/10 border-gold/20',
  }
  const labels: Record<EventStatus, string> = {
    draft: 'Kladde', published: 'Publiceret', cancelled: 'Aflyst', completed: 'Afholdt',
  }
  return <Badge className={cn('border', styles[status])} dot>{labels[status]}</Badge>
}

// ── Achievement Badge ──────────────────────────────────
export function AchievementBadge({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const badges: Record<string, { icon: string; label: string; color: string }> = {
    years_1:          { icon: '🌱', label: '1 År', color: 'text-forest-400 bg-forest/10 border-forest/20' },
    years_5:          { icon: '🌿', label: '5 År', color: 'text-forest-300 bg-forest/15 border-forest/30' },
    years_10:         { icon: '🦌', label: '10 År', color: 'text-gold bg-gold/10 border-gold/25' },
    years_15:         { icon: '👑', label: '15 År', color: 'text-gold bg-gold/15 border-gold/35' },
    years_20:         { icon: '⚜️', label: '20 År', color: 'text-gold bg-gradient-gold/5 border-gold/40' },
    perfect_attendance:{ icon: '✓', label: 'Altid til stede', color: 'text-blue-400 bg-blue/10 border-blue/20' },
    poll_master:      { icon: '📊', label: 'Afstemningsekspert', color: 'text-purple-400 bg-purple/10 border-purple/20' },
    founder:          { icon: '⚜️', label: 'Stifter', color: 'text-gold bg-gold/20 border-gold/40' },
    chairman_emeritus:{ icon: '🏅', label: 'Æresformand', color: 'text-amber-300 bg-amber/10 border-amber/30' },
    treasurer_award:  { icon: '💰', label: 'Kassererorden', color: 'text-emerald-400 bg-emerald/10 border-emerald/20' },
  }

  const badge = badges[type] ?? { icon: '★', label: type, color: 'text-muted bg-surface border-border' }
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium',
      badge.color, sizeClass
    )}>
      <span>{badge.icon}</span>
      {badge.label}
    </span>
  )
}
