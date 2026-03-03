'use client'

import Link from 'next/link'
import { CalendarDays, MapPin, Users, Check, HelpCircle, X as XIcon } from 'lucide-react'
import type { Event } from '@/lib/types'
import { useRSVP } from '@/lib/hooks/use-events'
import { useAuthStore } from '@/lib/stores/auth-store'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { SkeletonCard } from '@/components/ui/skeleton'

const RSVP_CONFIG = [
  { key: 'attending'     as const, label: 'Deltager',      icon: <Check size={11} />,       active: 'bg-forest text-ivory border-forest' },
  { key: 'maybe'         as const, label: 'Måske',         icon: <HelpCircle size={11} />,   active: 'bg-amber-900/50 text-amber-300 border-amber-700/50' },
  { key: 'not_attending' as const, label: 'Deltager ikke', icon: <XIcon size={11} />,        active: 'bg-red-900/40 text-red-300 border-red-800/40' },
]

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export function UpcomingEventsCard({ events, isLoading }: { events: Event[]; isLoading: boolean }) {
  const { mutate: rsvp, isPending } = useRSVP()
  const { profile } = useAuthStore()

  if (isLoading) return <SkeletonCard />

  return (
    <div className="bg-charcoal border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-gold/60" />
          <h3 className="font-serif text-heading-sm text-parchment">Kommende begivenheder</h3>
        </div>
        <Link href="/events" className="text-xs text-muted hover:text-gold transition-colors">
          Se alle →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="px-5 pb-6 text-center py-10">
          <CalendarDays size={28} className="text-muted/30 mx-auto mb-2" />
          <p className="text-sm text-muted">Ingen kommende begivenheder</p>
          <Link href="/events" className="text-xs text-gold hover:text-gold/80 mt-2 inline-block">
            Opret begivenhed →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {events.map((event, idx) => {
            const myRSVP = event.participants?.find((p) => p.user_id === profile?.id)?.rsvp
            const attending = event.participants?.filter((p) => p.rsvp === 'attending') ?? []
            const days = daysUntil(event.starts_at)
            const isFeatured = idx === 0

            return (
              <div
                key={event.id}
                className={`px-5 py-4 transition-colors hover:bg-surface/30 ${
                  !myRSVP ? 'bg-gold/[0.03]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Date block */}
                  <div className={`flex-shrink-0 w-10 text-center rounded-lg py-1.5 border ${
                    !myRSVP
                      ? 'border-gold/30 bg-gold/10'
                      : myRSVP === 'attending'
                        ? 'border-forest/40 bg-forest/10'
                        : 'border-border bg-surface/40'
                  }`}>
                    <p className={`text-lg font-serif font-bold leading-none ${!myRSVP ? 'text-gold' : myRSVP === 'attending' ? 'text-green-400' : 'text-muted'}`}>
                      {format(new Date(event.starts_at), 'd')}
                    </p>
                    <p className="text-[9px] text-muted uppercase tracking-wide mt-0.5">
                      {format(new Date(event.starts_at), 'MMM', { locale: da })}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-parchment truncate">{event.title}</p>
                        {event.location && (
                          <p className="text-xs text-muted flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={9} className="text-gold/40 flex-shrink-0" />
                            {event.location}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {days <= 14 && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            days <= 3 ? 'bg-red-900/30 text-red-300' : 'bg-gold/10 text-gold/80'
                          }`}>
                            {days === 0 ? 'I dag!' : days === 1 ? 'I morgen' : `Om ${days}d`}
                          </span>
                        )}
                        {!myRSVP && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-gold/10 text-gold border border-gold/20 rounded-full animate-pulse">
                            Svar mangler
                          </span>
                        )}
                        {myRSVP && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                            myRSVP === 'attending'
                              ? 'bg-forest/20 text-green-400 border-forest/30'
                              : myRSVP === 'maybe'
                                ? 'bg-amber-900/20 text-amber-400 border-amber-700/30'
                                : 'bg-red-900/20 text-red-400 border-red-800/30'
                          }`}>
                            {myRSVP === 'attending' ? '✓ Deltager' : myRSVP === 'maybe' ? '? Måske' : '✗ Nej'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* RSVP + attendees row */}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className="flex gap-1.5">
                        {RSVP_CONFIG.map(({ key, label, active }) => (
                          <button
                            key={key}
                            disabled={isPending}
                            onClick={() => rsvp({ eventId: event.id, rsvp: key })}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                              myRSVP === key ? active : 'border-border/60 text-muted/60 hover:text-parchment hover:border-border'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted">
                        <Users size={9} />
                        <span>{attending.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Link to detail — only on featured */}
                {isFeatured && (
                  <div className="mt-2 flex justify-end">
                    <Link href={`/events/${event.id}`} className="text-[10px] text-muted hover:text-gold transition-colors">
                      Detaljer →
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
