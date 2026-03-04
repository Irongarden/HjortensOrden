'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { usePolls } from '@/lib/hooks/use-polls'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PollCard } from './poll-card'
import { CreatePollModal } from './create-poll-modal'
import type { PollStatus } from '@/lib/types'

type Tab = 'active' | 'closed'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export function PollsContent() {
  const [tab, setTab] = useState<Tab>('active')
  const [createOpen, setCreateOpen] = useState(false)
  const { can } = useAuthStore()

  const { data: polls = [], isLoading } = usePolls(tab as PollStatus)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between page-header-row">
        <div>
          <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Ordenens</p>
          <h1 className="font-serif text-display-sm text-parchment">Afstemninger</h1>
        </div>
        {can('create_polls') && (
          <Button variant="gold" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Ny afstemning
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {([['active', 'Aktive'], ['closed', 'Afsluttede']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === key
                ? 'text-gold border-gold'
                : 'text-muted border-transparent hover:text-parchment hover:border-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-charcoal border border-border rounded-xl p-5 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-8 w-full rounded-lg" />)}
              </div>
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p className="text-heading-sm mb-2 font-serif text-parchment/60">
            {tab === 'active' ? 'Ingen aktive afstemninger' : 'Ingen afsluttede afstemninger'}
          </p>
          <p className="text-sm">
            {tab === 'active' && can('create_polls') ? 'Opret den første afstemning herover.' : ''}
          </p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
          {polls.map((poll) => (
            <motion.div key={poll.id} variants={item}>
              <PollCard poll={poll} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <CreatePollModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </motion.div>
  )
}
