'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatRelative } from '@/lib/utils'
import { SkeletonRow } from '@/components/ui/skeleton'
import { Activity, CalendarDays, Vote, Users, Hammer } from 'lucide-react'

const supabase = createClient()

const AUDIT_LABELS: Record<string, string> = {
  event_created:        'oprettede en begivenhed',
  event_updated:        'opdaterede en begivenhed',
  event_deleted:        'slettede en begivenhed',
  poll_created:         'oprettede en afstemning',
  poll_closed:          'lukkede en afstemning',
  member_invited:       'inviterede et nyt medlem',
  payment_registered:   'registrerede en betaling',
  role_changed:         'ændrede en rolle',
  image_uploaded:       'uploadede billeder',
  timeline_entry:       'tilføjede en tidslinje-post',
}

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idé', planning: 'Planlægning', confirmed: 'Bekræftet', archived: 'Arkiveret',
}

type IconType = 'event' | 'poll' | 'proposal' | 'member' | 'default'

type FeedEntry = {
  id: string
  actorName: string
  text: string
  subject?: string
  created_at: string
  icon: IconType
}

export function ActivityFeed() {
  const { data: entries = [], isLoading } = useQuery<FeedEntry[]>({
    queryKey: ['activity-feed-v2'],
    queryFn: async () => {
      const [auditRes, proposalRes, pollVoteRes] = await Promise.all([
        // Global audit log (privileged — may return empty for regular members, that's fine)
        supabase
          .from('audit_log')
          .select('id, action, created_at, metadata, actor:profiles!audit_log_actor_id_fkey(id, full_name, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(10),

        // Proposal audit log — members can read own proposal actions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('proposal_audit_log')
          .select('id, action, created_at, details, actor:profiles!actor_id(id, full_name, avatar_url), proposal:arrangement_proposals!proposal_id(title)')
          .in('action', ['stage_changed', 'field_updated'])
          .order('created_at', { ascending: false })
          .limit(10),

        // Recent poll votes joined to poll title
        supabase
          .from('poll_votes')
          .select('id, voted_at, voter:profiles!user_id(id, full_name, avatar_url), poll:polls!poll_id(title)')
          .order('voted_at', { ascending: false })
          .limit(8),
      ])

      const auditEntries: FeedEntry[] = (auditRes.data ?? []).map((e) => {
        const actor = e.actor as unknown as { full_name: string } | null
        const meta  = e.metadata as { title?: string } | null
        const icon: IconType = e.action.startsWith('event') ? 'event'
          : e.action.startsWith('poll') ? 'poll'
          : e.action.startsWith('member') ? 'member'
          : 'default'
        return {
          id: `audit-${e.id}`,
          actorName: actor?.full_name ?? 'Et medlem',
          text: AUDIT_LABELS[e.action] ?? e.action,
          subject: meta?.title,
          created_at: e.created_at,
          icon,
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proposalEntries: FeedEntry[] = (proposalRes.data ?? []).map((e: any) => {
        const actor    = e.actor    as unknown as { full_name: string } | null
        const proposal = e.proposal as unknown as { title: string } | null
        const details  = e.details  as { to?: string } | null
        const title    = proposal?.title ?? 'et forslag'
        const text = e.action === 'stage_changed'
          ? `rykkede "${title}" til ${STAGE_LABELS[details?.to ?? ''] ?? details?.to ?? 'næste trin'}`
          : `opdaterede "${title}"`
        return {
          id: `prop-${e.id}`,
          actorName: actor?.full_name ?? 'Et medlem',
          text,
          created_at: e.created_at,
          icon: 'proposal' as const,
        }
      })

      const pollVoteEntries: FeedEntry[] = (pollVoteRes.data ?? []).map((e) => {
        const voter = e.voter as unknown as { full_name: string } | null
        const poll  = e.poll  as unknown as { title: string } | null
        return {
          id: `vote-${e.id}`,
          actorName: voter?.full_name ?? 'Et medlem',
          text: 'stemte i afstemningen',
          subject: poll?.title,
          created_at: e.voted_at,
          icon: 'poll' as const,
        }
      })

      return [...auditEntries, ...proposalEntries, ...pollVoteEntries]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15)
    },
    staleTime: 30_000,
  })

  function IconDot({ icon }: { icon: IconType }) {
    const cls = 'flex-shrink-0 mt-1'
    if (icon === 'event')    return <CalendarDays size={12} className={`${cls} text-blue-400/60`} />
    if (icon === 'poll')     return <Vote         size={12} className={`${cls} text-purple-400/60`} />
    if (icon === 'proposal') return <Hammer       size={12} className={`${cls} text-amber-400/60`} />
    if (icon === 'member')   return <Users        size={12} className={`${cls} text-green-400/60`} />
    return <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1.5 flex-shrink-0" />
  }

  return (
    <div className="bg-charcoal border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Activity size={16} className="text-gold/60" />
        <h3 className="font-serif text-heading-sm text-parchment">Seneste Aktivitet</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : !entries.length ? (
        <p className="text-sm text-muted text-center py-6">Ingen aktivitet endnu</p>
      ) : (
        <div className="divide-y divide-border/50">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 py-3">
              <IconDot icon={entry.icon} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-parchment/90 leading-snug">
                  <span className="font-medium">{entry.actorName}</span>
                  {' '}{entry.text}
                  {entry.subject && (
                    <span className="text-gold/70"> — {entry.subject}</span>
                  )}
                </p>
                <p className="text-xs text-muted mt-0.5">{formatRelative(entry.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
