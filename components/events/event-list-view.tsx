'use client'

import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Event } from '@/lib/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { EventStatusBadge } from '@/components/ui/badge'
import { groupBy } from '@/lib/utils'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

export function EventListView({
  events, onSelect, reverse = false,
}: { events: Event[]; onSelect: (event: Event) => void; reverse?: boolean }) {
  const sorted = [...events].sort((a, b) => {
    const diff = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    return reverse ? -diff : diff
  })
  const grouped = groupBy(
    sorted,
    // @ts-ignore
    (e: Event) => format(new Date(e.starts_at), 'MMMM yyyy', { locale: da })
  )

  const months = Object.keys(grouped)

  if (!months.length) {
    return (
      <div className="text-center py-16 text-muted">
        <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
        <p>Ingen begivenheder fundet</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {months.map((month) => (
        <div key={month}>
          <div className="ornament mb-4">
            <span className="capitalize">{month}</span>
          </div>
          <div className="space-y-2">
            {(grouped as Record<string, Event[]>)[month].map((event) => (
              <button
                key={event.id}
                onClick={() => onSelect(event)}
                className="w-full text-left bg-charcoal border border-border rounded-xl p-4
                           hover:border-gold/25 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Date block */}
                  <div className="text-center flex-shrink-0 w-12">
                    <p className="text-2xl font-serif font-bold text-gold leading-none">
                      {format(new Date(event.starts_at), 'd')}
                    </p>
                    <p className="text-xs text-muted uppercase">
                      {format(new Date(event.starts_at), 'MMM', { locale: da })}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif text-heading-sm text-parchment group-hover:text-gold
                                     transition-colors truncate">
                        {event.title}
                      </h3>
                      <EventStatusBadge status={event.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={11} />
                        {formatDateTime(event.starts_at)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {event.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {event.participants?.filter((p) => p.rsvp === 'attending').length ?? 0} deltager
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
