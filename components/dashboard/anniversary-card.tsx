'use client'

import { Award } from 'lucide-react'
import { Profile } from '@/lib/types'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface AnniversaryEntry {
  profile: Profile
  years: number
  daysUntil: number
  anniversary_date: string
}

export function AnniversaryCard({ anniversaries }: { anniversaries: AnniversaryEntry[] }) {
  return (
    <div className="bg-charcoal border border-gold/15 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award size={16} className="text-gold" />
        <h3 className="font-serif text-heading-sm text-parchment">Kommende Jubilæer</h3>
      </div>

      <div className="space-y-3">
        {anniversaries.map((a) => (
          <div key={a.profile.id} className="flex items-center gap-3">
            <Avatar src={a.profile.avatar_url} name={a.profile.full_name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-parchment truncate">{a.profile.full_name}</p>
              <p className="text-xs text-gold/80 font-serif">{a.years} år i ordenen</p>
            </div>
            <span className={cn(
              'text-xs px-2 py-1 rounded-full border',
              a.daysUntil === 0
                ? 'text-gold bg-gold/15 border-gold/30'
                : a.daysUntil <= 7
                  ? 'text-amber-400 bg-amber-900/20 border-amber-800/30'
                  : 'text-muted bg-surface border-border'
            )}>
              {a.daysUntil === 0 ? 'I dag 🎉' : `Om ${a.daysUntil}d`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
