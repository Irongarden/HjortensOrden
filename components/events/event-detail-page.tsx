'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  CalendarDays, MapPin, Users, DollarSign, Pencil, Trash2,
  ArrowLeft, Clock, Check, X as XIcon, HelpCircle, Images,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { useEvent, useRSVP, useDeleteEvent } from '@/lib/hooks/use-events'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { AvatarGroup, Avatar } from '@/components/ui/avatar'
import { RSVPBadge, EventStatusBadge } from '@/components/ui/badge'
import { PageLoader, Skeleton } from '@/components/ui/skeleton'
import { ConfirmModal } from '@/components/ui/modal'
import { EventModal } from './event-modal'
import { formatDateTime, formatDKK, formatDate } from '@/lib/utils'
import type { RSVPStatus, GalleryAlbum } from '@/lib/types'
import type { Database } from '@/lib/types/supabase'
import Link from 'next/link'

// ── Gallery helpers ───────────────────────────────────────────────────────────
function createDB() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as SupabaseClient<Database>
}

function useEventAlbums(eventId: string) {
  return useQuery({
    queryKey: ['event-albums', eventId],
    queryFn: async () => {
      const db = createDB()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (db as any)
        .from('gallery_albums')
        .select('id, title, cover_image_url, event_date, event_id')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as GalleryAlbum[]
    },
    staleTime: 60_000,
    enabled: !!eventId,
  })
}

function useAllAlbumsForPicker(enabled: boolean) {
  return useQuery({
    queryKey: ['gallery-albums-picker'],
    queryFn: async () => {
      const db = createDB()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (db as any)
        .from('gallery_albums')
        .select('id, title, cover_image_url, event_date, event_id')
        .order('event_date', { ascending: false })
        .limit(60)
      if (error) throw error
      return data as GalleryAlbum[]
    },
    staleTime: 60_000,
    enabled,
  })
}

function useLinkAlbumToEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ albumId, eventId }: { albumId: string; eventId: string }) => {
      const db = createDB()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any)
        .from('gallery_albums')
        .update({ event_id: eventId })
        .eq('id', albumId)
      if (error) throw error
    },
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['event-albums', eventId] })
      qc.invalidateQueries({ queryKey: ['gallery-albums'] })
      qc.invalidateQueries({ queryKey: ['gallery-albums-picker'] })
      toast.success('Album knyttet til begivenheden')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─────────────────────────────────────────────────────────────────────────────

const RSVP_CONFIG: { status: RSVPStatus; label: string; icon: React.ReactNode; active: string }[] = [
  { status: 'attending',     label: 'Deltager',       icon: <Check size={14} />,     active: 'bg-forest text-ivory border-forest' },
  { status: 'maybe',         label: 'Måske',          icon: <HelpCircle size={14} />, active: 'bg-amber-900/50 text-amber-300 border-amber-700/50' },
  { status: 'not_attending', label: 'Deltager ikke',  icon: <XIcon size={14} />,     active: 'bg-red-900/40 text-red-300 border-red-800/40' },
]

export function EventDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { profile, can } = useAuthStore()
  const { data: event, isLoading, error } = useEvent(id)
  const { mutate: rsvp, isPending: rsvpPending } = useRSVP()
  const deleteEvent = useDeleteEvent()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [showAlbumPicker, setShowAlbumPicker] = useState(false)

  // Album hooks must be called unconditionally (Rules of Hooks)
  const { data: linkedAlbums = [] } = useEventAlbums(id)
  const { data: allAlbums = [], isLoading: allAlbumsLoading } = useAllAlbumsForPicker(showAlbumPicker)
  const linkAlbumToEvent = useLinkAlbumToEvent()

  if (isLoading) return (
    <div className="space-y-6 max-w-3xl">
      <Skeleton className="h-8 w-64" />
      <div className="bg-charcoal border border-border rounded-2xl p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
    </div>
  )
  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <CalendarDays size={48} className="text-muted opacity-30" />
        <h2 className="font-serif text-heading-lg text-parchment">Begivenhed ikke fundet</h2>
        <Link href="/events"><Button variant="ghost">← Tilbage til kalender</Button></Link>
      </div>
    )
  }

  const myParticipant = event.participants?.find((p) => p.user_id === profile?.id)
  const isCreator = event.created_by === profile?.id
  const attending = event.participants?.filter((p) => p.rsvp === 'attending') ?? []
  const maybe = event.participants?.filter((p) => p.rsvp === 'maybe') ?? []
  const notAttending = event.participants?.filter((p) => p.rsvp === 'not_attending') ?? []
  const totalExpenses = event.expenses?.reduce((s, e) => s + e.amount_dkk, 0) ?? 0
  const canLinkAlbum = can('manage_albums') || isCreator || can('edit_events')

  const handleDelete = async () => {
    router.push('/events')
    await deleteEvent.mutateAsync(event.id)
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl mx-auto">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-parchment transition-colors text-sm">
            <ArrowLeft size={16} /> Tilbage
          </button>
          <div className="flex gap-2">
            {(can('edit_events') || isCreator) && (
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} /> Rediger
              </Button>
            )}
            {(can('delete_events') || isCreator) && (
              <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={14} /> Slet
              </Button>
            )}
          </div>
        </div>

        {/* Cover image */}
        {event.cover_image_url && (
          <div className="rounded-2xl overflow-hidden h-64 relative">
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-transparent" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <EventStatusBadge status={event.status} />
              {myParticipant && <RSVPBadge rsvp={myParticipant.rsvp} />}
            </div>
            <h1 className="font-serif text-display-sm text-parchment">{event.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left — details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meta */}
            <div className="bg-charcoal border border-border rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CalendarDays size={18} className="text-gold/60 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted mb-0.5">Start</p>
                    <p className="text-sm text-parchment">{formatDateTime(event.starts_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-gold/60 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted mb-0.5">Slut</p>
                    <p className="text-sm text-parchment">{formatDateTime(event.ends_at)}</p>
                  </div>
                </div>
                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-gold/60 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted mb-0.5">Lokation</p>
                      <p className="text-sm text-parchment">{event.location}</p>
                    </div>
                  </div>
                )}
                {event.budget_dkk && (
                  <div className="flex items-start gap-3">
                    <DollarSign size={18} className="text-gold/60 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted mb-0.5">Budget</p>
                      <p className="text-sm text-parchment">{formatDKK(event.budget_dkk)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="bg-charcoal border border-border rounded-2xl p-6">
                <h3 className="font-serif text-heading-xs text-parchment mb-3">Beskrivelse</h3>
                <p className="text-sm text-parchment/80 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Participants */}
            <div className="bg-charcoal border border-border rounded-2xl p-6">
              <h3 className="font-serif text-heading-xs text-parchment mb-4">
                Deltagere <span className="text-muted font-sans text-sm font-normal">({attending.length} bekræftet)</span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: `Deltager (${attending.length})`, members: attending, color: 'text-green-400' },
                  { label: `Måske (${maybe.length})`, members: maybe, color: 'text-amber-400' },
                  { label: `Deltager ikke (${notAttending.length})`, members: notAttending, color: 'text-red-400' },
                ].map(({ label, members, color }) => (
                  <div key={label} className="bg-surface rounded-xl p-3">
                    <p className={`text-xs ${color} mb-2 font-medium`}>{label}</p>
                    {members.length > 0
                      ? <AvatarGroup members={members.map((p) => p.profile!).filter(Boolean)} max={6} size="sm" />
                      : <p className="text-xs text-muted/60">Ingen</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses */}
            {(event.budget_dkk || (event.expenses?.length ?? 0) > 0) && (
              <div className="bg-charcoal border border-border rounded-2xl p-6">
                <h3 className="font-serif text-heading-xs text-parchment mb-4">Økonomi</h3>
                <div className="space-y-2">
                  {event.budget_dkk && (
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-muted">Planlagt budget</span>
                      <span className="text-parchment font-medium font-mono">{formatDKK(event.budget_dkk)}</span>
                    </div>
                  )}
                  {event.expenses?.map((exp) => (
                    <div key={exp.id} className="flex justify-between text-sm py-1 border-t border-border/40">
                      <span className="text-muted">{exp.description}</span>
                      <span className="text-red-400 font-mono">- {formatDKK(exp.amount_dkk)}</span>
                    </div>
                  ))}
                  {totalExpenses > 0 && (
                    <div className="flex justify-between text-sm pt-2 border-t border-border font-medium">
                      <span className="text-muted">Total udgifter</span>
                      <span className="text-parchment font-mono">{formatDKK(totalExpenses)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Billeder */}
            <div className="bg-charcoal border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-heading-xs text-parchment flex items-center gap-2">
                  <Images size={16} className="text-gold/60" /> Billeder
                </h3>
                {canLinkAlbum && (
                  <Button
                    size="sm"
                    variant={showAlbumPicker ? 'gold' : 'outline'}
                    onClick={() => setShowAlbumPicker((v) => !v)}
                  >
                    {showAlbumPicker ? 'Luk' : linkedAlbums.length > 0 ? '+ Tilknyt flere' : '+ Tilknyt album'}
                  </Button>
                )}
              </div>

              {/* Album picker */}
              {showAlbumPicker && (
                <div className="mb-4 rounded-xl border border-border overflow-hidden">
                  {allAlbumsLoading ? (
                    <div className="py-6 text-center text-sm text-muted">Henter albums…</div>
                  ) : allAlbums.length === 0 ? (
                    <p className="text-sm text-muted p-4 text-center">Ingen albums i galleriet endnu</p>
                  ) : (
                    <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
                      {allAlbums.map((al) => {
                        const isLinked = linkedAlbums.some((la) => la.id === al.id)
                        return (
                          <button
                            key={al.id}
                            disabled={linkAlbumToEvent.isPending || isLinked}
                            onClick={() => {
                              linkAlbumToEvent.mutate({ albumId: al.id, eventId: event.id })
                              setShowAlbumPicker(false)
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                              isLinked ? 'opacity-60 cursor-default bg-gold/5' : 'hover:bg-surface/60 cursor-pointer'
                            }`}
                          >
                            {al.cover_image_url
                              ? <img src={al.cover_image_url} alt={al.title} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                              : <div className="w-8 h-8 bg-surface rounded flex items-center justify-center flex-shrink-0"><Images size={14} className="text-muted" /></div>
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-parchment truncate">{al.title}</p>
                              {al.event_date && <p className="text-xs text-muted">{formatDate(al.event_date)}</p>}
                            </div>
                            {isLinked && <Check size={14} className="text-gold flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {linkedAlbums.length > 0 ? (
                <div className="space-y-3">
                  {linkedAlbums.map((al) => (
                    <div key={al.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface/40 border border-border/60">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface border border-border flex-shrink-0">
                        {al.cover_image_url
                          ? <img src={al.cover_image_url} alt={al.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Images size={20} className="text-muted/40" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-parchment text-sm">{al.title}</p>
                        {al.event_date && <p className="text-xs text-muted mt-0.5">{formatDate(al.event_date)}</p>}
                        <Link href="/gallery" className="text-xs text-gold hover:text-gold/80 transition-colors mt-1 inline-block">
                          Se album i galleri →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted">
                  <Images size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Ingen billeder knyttet til denne begivenhed</p>
                  {canLinkAlbum && !showAlbumPicker && (
                    <p className="text-xs mt-1 opacity-60">Klik &quot;+ Tilknyt album&quot; for at vælge et album</p>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right — RSVP */}
          <div className="space-y-4">
            <div className="bg-charcoal border border-border rounded-2xl p-6 sticky top-24">
              <h3 className="font-serif text-heading-xs text-parchment mb-4">Din tilmelding</h3>
              <div className="space-y-2">
                {RSVP_CONFIG.map(({ status, label, icon, active }) => (
                  <button
                    key={status}
                    disabled={rsvpPending}
                    onClick={() => rsvp({ eventId: event.id, rsvp: status })}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                      myParticipant?.rsvp === status
                        ? active
                        : 'bg-surface border-border text-muted hover:text-parchment hover:border-border/80'
                    }`}
                  >
                    {icon}
                    {label}
                    {myParticipant?.rsvp === status && <Check size={14} className="ml-auto" />}
                  </button>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-border/40 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Users size={12} />
                  <span>{attending.length} deltager{attending.length !== 1 ? 'e' : ''} bekræftet</span>
                </div>
                {attending.length > 0 && (
                  <AvatarGroup members={attending.map((p) => p.profile!).filter(Boolean)} max={6} size="xs" />
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {editOpen && (
        <EventModal open={editOpen} onClose={() => setEditOpen(false)} event={event} />
      )}

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Slet begivenhed"
        description={`Er du sikker på, at du vil slette "${event.title}"? Denne handling kan ikke fortrydes.`}
        confirmLabel="Slet begivenhed"
        danger
        loading={deleteEvent.isPending}
      />
    </>
  )
}
