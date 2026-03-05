'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAuthReady } from '@/lib/hooks/use-auth-ready'
import { formatRelative } from '@/lib/utils'
import { Hammer, ArrowRight, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { SkeletonRow } from '@/components/ui/skeleton'
import type { LifecycleStage } from '@/lib/types'

const supabase = createClient()

const STAGE_CONFIG: Record<LifecycleStage, { label: string; color: string }> = {
  idea:      { label: 'Idé',         color: 'text-purple-400 bg-purple-900/20 border-purple-700/30' },
  planning:  { label: 'Planlægning', color: 'text-amber-400  bg-amber-900/20  border-amber-700/30'  },
  confirmed: { label: 'Bekræftet',   color: 'text-green-400  bg-green-900/20  border-green-700/30'  },
  archived:  { label: 'Arkiveret',   color: 'text-muted      bg-surface/30    border-border'         },
}

type ProposalRow = {
  id: string
  title: string
  lifecycle_stage: LifecycleStage
  publish_status: string
  proposed_date_from: string | null
  updated_at: string
}

export function InProgressProposalsCard() {
  const { profile } = useAuthStore()
  const authReady = useAuthReady()

  const { data: proposals = [], isLoading } = useQuery<ProposalRow[]>({
    queryKey: ['proposals', 'in-progress', profile?.id],
    enabled: authReady && !!profile?.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('arrangement_proposals')
        .select('id, title, lifecycle_stage, publish_status, proposed_date_from, updated_at')
        .neq('lifecycle_stage', 'archived')
        .or(`created_by.eq.${profile!.id},collaborator_ids.cs.{${profile!.id}}`)
        .order('updated_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data as ProposalRow[]
    },
    staleTime: 30_000,
  })

  return (
    <div className="bg-charcoal border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Hammer size={15} className="text-gold/60" />
          <h3 className="font-serif text-heading-sm text-parchment">Arrangementer i gang</h3>
        </div>
        <Link
          href="/inspiration?tab=workshop"
          className="text-xs text-muted hover:text-gold transition-colors"
        >
          Åbn værksted →
        </Link>
      </div>

      {isLoading ? (
        <div className="px-5 pb-5 space-y-2">
          {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : proposals.length === 0 ? (
        <div className="px-5 pb-6 text-center py-8">
          <Hammer size={26} className="text-muted/30 mx-auto mb-2" />
          <p className="text-sm text-muted">Ingen forslag under planlægning</p>
          <Link
            href="/inspiration"
            className="text-xs text-gold hover:text-gold/80 mt-2 inline-block"
          >
            Start et nyt forslag →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {proposals.map((p) => {
            const stage = STAGE_CONFIG[p.lifecycle_stage] ?? STAGE_CONFIG.idea
            return (
              <Link
                key={p.id}
                href={`/inspiration?proposal=${p.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface/30 transition-colors group"
              >
                {/* Stage badge */}
                <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${stage.color}`}>
                  {stage.label}
                </span>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-parchment truncate group-hover:text-gold transition-colors">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {p.proposed_date_from && (
                      <span className="flex items-center gap-1 text-[10px] text-muted">
                        <CalendarDays size={9} className="text-gold/40" />
                        {new Date(p.proposed_date_from).toLocaleDateString('da-DK', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    )}
                    <span className="text-[10px] text-muted">
                      Opdateret {formatRelative(p.updated_at)}
                    </span>
                  </div>
                </div>

                <ArrowRight size={13} className="text-muted/40 group-hover:text-gold flex-shrink-0 transition-colors" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
