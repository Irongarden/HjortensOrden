'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/ui/skeleton'
import { TimelineEntry } from '@/components/timeline/timeline-entry'
import { TimelineEntryModal } from '@/components/timeline/timeline-entry-modal'
import type { Database } from '@/lib/types/supabase'
import type { TimelineEntry as TEntry } from '@/lib/types'

function useTimelineEntries() {
  return useQuery({
    queryKey: ['timeline'],
    queryFn: async () => {
      const supabase = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data, error } = await supabase
        .from('timeline_entries')
        .select('*, creator:profiles!created_by(id, full_name, avatar_url)')
        .order('entry_date', { ascending: false })
      if (error) throw error
      return data as TEntry[]
    },
    staleTime: 60_000,
  })
}

export function TimelineContent() {
  const { can } = useAuthStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<TEntry | null>(null)
  const { data: entries = [], isLoading } = useTimelineEntries()

  if (isLoading) return <PageLoader />

  // Group entries by year
  const byYear: Record<number, TEntry[]> = {}
  entries.forEach((e) => {
    const year = new Date(e.entry_date).getFullYear()
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(e)
  })
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-end justify-between page-header-row">
        <div>
          <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Ordenens</p>
          <h1 className="font-serif text-display-sm text-parchment">Tidslinje</h1>
        </div>
        {can('manage_timeline') && (
          <Button variant="gold" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Nyt kapitel
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p className="font-serif text-parchment/50 text-heading-sm">Historien begynder her</p>
          {can('manage_timeline') && (
            <p className="text-sm mt-2">Tilføj det første kapitel i ordenens krønike.</p>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Central vertical line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-gold/40 via-border to-transparent" />

          <div className="space-y-0">
            {years.map((year) => (
              <div key={year}>
                {/* Year marker */}
                <div className="relative flex items-center justify-center md:justify-start mb-0 pl-12 md:pl-0">
                  <div className="sticky top-20 z-10 md:absolute md:left-1/2 md:-translate-x-1/2 my-6 bg-gold text-obsidian text-sm font-bold font-mono px-3 py-1 rounded-full shadow-gold-sm">
                    {year}
                  </div>
                </div>

                {byYear[year].map((entry, idx) => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    side={idx % 2 === 0 ? 'left' : 'right'}
                    canEdit={can('manage_timeline')}
                    onEdit={() => setEditEntry(entry)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <TimelineEntryModal
        open={createOpen || editEntry !== null}
        entry={editEntry ?? undefined}
        onClose={() => { setCreateOpen(false); setEditEntry(null) }}
      />
    </motion.div>
  )
}
