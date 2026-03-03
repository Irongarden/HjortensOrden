'use client'

import { useState } from 'react'
import { CheckSquare, Clock, Lock } from 'lucide-react'
import { Poll } from '@/lib/types'
import { useVotePoll } from '@/lib/hooks/use-polls'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function ActivePollCard({ poll }: { poll: Poll }) {
  const { mutate: vote, isPending } = useVotePoll()
  const [hovered, setHovered] = useState<number | null>(null)

  const hasVoted = !!poll.user_vote
  const totalVotes = poll.results?.reduce((s, r) => s + r.vote_count, 0) ?? 0
  const deadline = new Date(poll.deadline)
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000))

  return (
    <div className={`bg-charcoal border rounded-xl p-6 transition-all ${
      !hasVoted
        ? 'border-gold/40 ring-1 ring-gold/20 shadow-[0_0_20px_rgba(207,168,74,0.08)]'
        : 'border-border'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-gold/60" />
          <p className="text-label-sm text-gold/80 uppercase tracking-widest">Aktiv afstemning</p>
        </div>
        <div className="flex items-center gap-2">
          {!hasVoted && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gold/10 text-gold border border-gold/30 rounded-full animate-pulse">
              Stem nu
            </span>
          )}
          {poll.is_anonymous && (
            <span className="flex items-center gap-1 text-[10px] text-muted border border-border rounded-full px-2 py-0.5">
              <Lock size={10} />
              Anonym
            </span>
          )}
        </div>
      </div>
      <h3 className="font-serif text-heading-md text-parchment mb-1">{poll.title}</h3>
      {poll.description && (
        <p className="text-sm text-muted mb-4">{poll.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted mb-5">
        <span>{totalVotes} stemme{totalVotes !== 1 ? 'r' : ''}</span>
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {daysLeft === 0 ? 'Udløber i dag' : `${daysLeft} dag${daysLeft !== 1 ? 'e' : ''} tilbage`}
        </span>
        {poll.min_participation > 0 && (
          <span>Min. {poll.min_participation} stemmer kræves</span>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {poll.results?.map((result) => {
          const isVoted = poll.user_vote?.option_index === result.option_index
          const isHovered = hovered === result.option_index

          return (
            <button
              key={result.option_index}
              disabled={hasVoted || isPending}
              onClick={() => !hasVoted && vote({ pollId: poll.id, optionIndex: result.option_index })}
              onMouseEnter={() => setHovered(result.option_index)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'w-full text-left rounded-lg border transition-all duration-200',
                'relative overflow-hidden',
                hasVoted
                  ? isVoted
                    ? 'border-gold/40 cursor-default'
                    : 'border-border cursor-default opacity-80'
                  : 'border-border hover:border-gold/30 cursor-pointer',
              )}
            >
              {/* Progress bar fill */}
              {hasVoted && (
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 transition-all duration-700',
                    isVoted ? 'bg-gold/15' : 'bg-surface/50'
                  )}
                  style={{ width: `${result.percentage}%` }}
                />
              )}

              <div className="relative px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {isVoted && <span className="text-gold text-xs">✓</span>}
                  <span className={cn(
                    'text-sm truncate',
                    isVoted ? 'text-parchment font-medium' : 'text-parchment/80'
                  )}>
                    {result.option_text}
                  </span>
                </div>
                {hasVoted && (
                  <span className={cn('text-xs flex-shrink-0', isVoted ? 'text-gold' : 'text-muted')}>
                    {result.percentage}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted">
          {hasVoted ? 'Du har stemt' : 'Afgiv din stemme'}
        </span>
        <Link href="/polls" className="text-xs text-gold/70 hover:text-gold transition-colors">
          Alle afstemninger →
        </Link>
      </div>
    </div>
  )
}
