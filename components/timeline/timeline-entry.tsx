'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Edit2, BookOpen, Award, Anchor, Sword, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import type { TimelineEntry as TEntry, TimelineEntryType } from '@/lib/types'

const TYPE_ICONS: Record<TimelineEntryType, React.ReactNode> = {
  founding:            <Anchor size={16} />,
  milestone:           <Star size={16} />,
  major_event:         <BookOpen size={16} />,
  chairman_transition: <Award size={16} />,
  anniversary:         <Sword size={16} />,
  other:               <BookOpen size={16} />,
}

const TYPE_COLORS: Record<TimelineEntryType, string> = {
  founding:            'bg-gold/20 text-gold border-gold/30',
  milestone:           'bg-forest/20 text-forest-400 border-forest/30',
  major_event:         'bg-surface text-parchment/80 border-border',
  chairman_transition: 'bg-purple-900/20 text-purple-400 border-purple-500/20',
  anniversary:         'bg-amber-900/20 text-amber-400 border-amber-500/20',
  other:               'bg-surface text-parchment/80 border-border',
}

interface TimelineEntryProps {
  entry: TEntry
  side: 'left' | 'right'
  canEdit: boolean
  onEdit: () => void
}

export function TimelineEntry({ entry, side, canEdit, onEdit }: TimelineEntryProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px 0px' })

  const isLeft = side === 'left'
  const author = entry.creator as { id: string; full_name: string; avatar_url?: string | null } | null

  return (
    <div ref={ref} className="relative flex items-start gap-4 mb-8 pl-12 md:pl-0">
      {/* Desktop layout */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`w-full md:w-[calc(50%-2rem)] ${isLeft ? 'md:mr-auto' : 'md:ml-auto'}`}
      >
        <div className="bg-charcoal border border-border rounded-xl p-5 hover:border-gold/20 transition-colors group">
          {/* Entry type badge */}
          <div className="flex items-center justify-between mb-3">
            <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${TYPE_COLORS[entry.type]}`}>
              {TYPE_ICONS[entry.type]}
              <span className="capitalize">{entry.type.replace('_', ' ')}</span>
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onEdit() }}
              >
                <Edit2 size={13} />
              </Button>
            )}
          </div>

          {/* Cover image */}
          {(entry.image_url || (entry.images && entry.images.length > 0)) && (
            <div className="rounded-lg overflow-hidden mb-4 aspect-video bg-surface">
              <img
                src={entry.image_url ?? entry.images![0]}
                alt={entry.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <h3 className="font-serif text-heading-sm text-parchment mb-2">{entry.title}</h3>
          {entry.description && (
            <p className="text-sm text-parchment/70 leading-relaxed">{entry.description}</p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
            <span className="text-xs text-gold font-mono">{formatDate(entry.entry_date)}</span>
            {author && (
              <div className="flex items-center gap-1.5 ml-auto">
                <Avatar src={author.avatar_url} name={author.full_name} size="xs" />
                <span className="text-xs text-muted">{author.full_name}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Central dot — shown on md+ */}
      <motion.div
        initial={{ scale: 0 }}
        animate={inView ? { scale: 1 } : {}}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="absolute left-5 md:left-1/2 top-5 -translate-x-1/2 w-3 h-3 rounded-full bg-gold border-2 border-obsidian shadow-gold-sm hidden md:block"
      />
      {/* Mobile dot */}
      <div className="absolute left-[18px] top-5 w-3 h-3 rounded-full bg-gold border-2 border-obsidian md:hidden" />
    </div>
  )
}
