'use client'

import Link from 'next/link'
import { CalendarDays, MapPin, Users, Clock } from 'lucide-react'
import { Event } from '@/lib/types'
import { formatDateTime, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AvatarGroup } from '@/components/ui/avatar'
import { useRSVP } from '@/lib/hooks/use-events'
import { useAuthStore } from '@/lib/stores/auth-store'
import Image from 'next/image'

export function NextEventCard({ event }: { event: Event | null }) {
  const { mutate: rsvp, isPending } = useRSVP()
  const { profile } = useAuthStore()

  if (!event) {
    return (
      <div className="bg-charcoal border border-border rounded-xl p-8 text-center">
        <CalendarDays size={32} className="text-muted mx-auto mb-3 opacity-40" />
        <h3 className="font-serif text-heading-sm text-parchment mb-1">Ingen kommende begivenheder</h3>
        <p className="text-sm text-muted">Der er ikke planlagt nogen begivenheder endnu.</p>
        <Link href="/events/new" className="inline-block mt-4">
          <Button variant="outline" size="sm">Opret begivenhed</Button>
        </Link>
      </div>
    )
  }

  const attendees = event.participants?.filter((p) => p.rsvp === 'attending') ?? []
  const myRSVP = event.participants?.find((p) => p.user_id === profile?.id)?.rsvp

  const daysUntil = Math.ceil(
    (new Date(event.starts_at).getTime() - Date.now()) / 86400000
  )

  return (
    <div className={`bg-charcoal border rounded-xl overflow-hidden
                    transition-all duration-300 group ${
      !myRSVP
        ? 'border-gold/40 ring-1 ring-gold/20 shadow-[0_0_20px_rgba(207,168,74,0.08)]'
        : 'border-border hover:border-gold/20'
    }`}>
      {/* Cover image */}
      {event.cover_image_url && (
        <div className="h-40 relative overflow-hidden">
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/20 to-transparent" />
          {daysUntil <= 7 && (
            <div className="absolute top-3 left-3 bg-gold text-obsidian text-xs font-bold
                            px-3 py-1 rounded-full">
              Om {daysUntil} {daysUntil === 1 ? 'dag' : 'dage'}
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-label-sm text-gold/80 uppercase tracking-widest mb-1">
              Næste begivenhed
            </p>
            <h3 className="font-serif text-heading-lg text-parchment">{event.title}</h3>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {!event.cover_image_url && daysUntil <= 7 && (
              <span className="bg-gold text-obsidian text-xs font-bold px-3 py-1 rounded-full">
                Om {daysUntil}d
              </span>
            )}
            {!myRSVP && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gold/10 text-gold border border-gold/30 rounded-full animate-pulse">
                Svar mangler
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <CalendarDays size={14} className="text-gold/60" />
            <span>{formatDateTime(event.starts_at)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <MapPin size={14} className="text-gold/60" />
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted">
            <Users size={14} className="text-gold/60" />
            <span>{attendees.length} deltager{attendees.length !== 1 ? 'e' : ''}</span>
          </div>
        </div>

        {attendees.length > 0 && (
          <div className="flex items-center gap-3 mb-5">
            <AvatarGroup
              members={attendees.map((p) => p.profile!).filter(Boolean)}
              max={5}
              size="xs"
            />
            <span className="text-xs text-muted">tilmeldte</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {(['attending', 'maybe', 'not_attending'] as const).map((status) => {
            const labels = { attending: 'Deltager', maybe: 'Måske', not_attending: 'Deltager ikke' }
            const isSelected = myRSVP === status
            return (
              <button
                key={status}
                onClick={() => rsvp({ eventId: event.id, rsvp: status })}
                disabled={isPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  isSelected
                    ? status === 'attending'
                      ? 'bg-forest text-ivory border-forest'
                      : status === 'maybe'
                        ? 'bg-amber-900/50 text-amber-300 border-amber-700/50'
                        : 'bg-red-900/40 text-red-300 border-red-800/40'
                    : 'bg-surface border-border text-muted hover:text-parchment hover:border-border/80'
                }`}
              >
                {labels[status]}
              </button>
            )
          })}
          <Link href={`/events/${event.id}`} className="ml-auto">
            <Button variant="ghost" size="sm">Detaljer →</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
