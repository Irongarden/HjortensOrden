'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, CheckCircle2, Pencil, X, Check } from 'lucide-react'
import { useVotePoll, useClosePoll, useUpdatePoll } from '@/lib/hooks/use-polls'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate, formatRelative } from '@/lib/utils'
import type { Poll } from '@/lib/types'

interface PollCardProps {
  poll: Poll
}

export function PollCard({ poll }: PollCardProps) {
  const { can } = useAuthStore()
  const vote = useVotePoll()
  const close = useClosePoll()
  const update = useUpdatePoll()
  const [selected, setSelected] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(poll.title)
  const [editDeadline, setEditDeadline] = useState(
    poll.deadline ? poll.deadline.slice(0, 16) : ''
  )

  const hasVoted = poll.user_vote !== null
  const isClosed = poll.status === 'closed'
  const showResults = hasVoted || isClosed
  const totalVotes = poll.results?.reduce((sum, r) => sum + r.vote_count, 0) ?? 0

  const handleVote = () => {
    if (selected === null) return
    vote.mutate({ pollId: poll.id, optionIndex: selected })
  }

  const handleSaveEdit = async () => {
    await update.mutateAsync({ id: poll.id, title: editTitle, deadline: editDeadline || undefined })
    setEditing(false)
  }

  return (
    <div className="bg-charcoal border border-border rounded-xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isClosed && <Lock size={13} className="text-muted" />}
            {poll.is_anonymous && (
              <span className="text-[10px] px-1.5 py-0.5 bg-surface border border-border rounded text-muted">Anonym</span>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="font-serif text-heading-sm"
                placeholder="Afstemningsspørgsmål"
              />
              <Input
                type="datetime-local"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                label="Lukkes"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="gold" loading={update.isPending} onClick={handleSaveEdit}>
                  <Check size={13} /> Gem
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditTitle(poll.title) }}>
                  <X size={13} /> Annuller
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-serif text-heading-sm text-parchment leading-snug">{poll.title}</h3>
              <p className="text-xs text-muted mt-1">
                Oprettet {formatRelative(poll.created_at)} · {totalVotes} stemmer
                {poll.deadline && !isClosed && ` · Lukker ${formatDate(poll.deadline)}`}
              </p>
            </>
          )}
        </div>
        {can('manage_polls') && !isClosed && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-muted hover:text-parchment hover:bg-surface transition-all"
            title="Rediger afstemning"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {(poll.options as string[]).map((optText, i) => {
          const result = poll.results?.find((r) => r.option_index === i)
          const isMyVote = poll.user_vote?.option_index === i
          const pct = result?.percentage ?? 0
          const votes = result?.vote_count ?? 0
          const isHighest = showResults && (result?.vote_count ?? 0) === Math.max(...(poll.results ?? []).map((r) => r.vote_count))

          return (
            <div key={i}>
              {showResults ? (
                <div className="relative overflow-hidden rounded-lg border border-border/70 bg-surface">
                  <motion.div
                    className={`absolute inset-y-0 left-0 ${isHighest ? 'bg-forest/25' : 'bg-white/[0.04]'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                  <div className="relative flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isMyVote && <CheckCircle2 size={14} className="text-gold flex-shrink-0" />}
                      <span className={`text-sm ${isMyVote ? 'text-gold font-medium' : 'text-parchment'}`}>{optText}</span>
                    </div>
                    <span className="text-xs font-mono text-muted">{pct.toFixed(0)}% ({votes})</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSelected(i)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                    selected === i
                      ? 'border-gold bg-gold/10 text-parchment'
                      : 'border-border bg-surface text-parchment/80 hover:border-border/80 hover:bg-white/[0.04]'
                  }`}
                >
                  {optText}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1">
        <div>
          {!showResults && !isClosed && (
            <Button
              variant="gold"
              size="sm"
              disabled={selected === null}
              loading={vote.isPending}
              onClick={handleVote}
            >
              Afgiv stemme
            </Button>
          )}
        </div>
        {can('manage_polls') && !isClosed && (
          <Button
            variant="ghost"
            size="sm"
            loading={close.isPending}
            onClick={() => close.mutate(poll.id)}
          >
            <Lock size={13} /> Luk afstemning
          </Button>
        )}
      </div>
    </div>
  )
}

