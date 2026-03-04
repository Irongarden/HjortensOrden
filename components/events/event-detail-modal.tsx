'use client'

import { useState } from 'react'
import { CalendarDays, MapPin, Users, DollarSign, Pencil, Trash2 } from 'lucide-react'
import { Event } from '@/lib/types'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { RSVPBadge, EventStatusBadge } from '@/components/ui/badge'
import { AvatarGroup } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useRSVP, useDeleteEvent } from '@/lib/hooks/use-events'
import { EventModal } from './event-modal'
import { formatDateTime, formatDKK } from '@/lib/utils'

export function EventDetailModal({
  event, open, onClose,
}: { event: Event; open: boolean; onClose: () => void }) {
  const { profile, can } = useAuthStore()
  const { mutate: rsvp, isPending } = useRSVP()
  const deleteEvent = useDeleteEvent()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const myParticipant = event.participants?.find((p) => p.user_id === profile?.id)
  const attending = event.participants?.filter((p) => p.rsvp === 'attending') ?? []
  const maybe = event.participants?.filter((p) => p.rsvp === 'maybe') ?? []
  const totalExpenses = event.expenses?.reduce((s, e) => s + e.amount_dkk, 0) ?? 0
  const isCreator = event.created_by === profile?.id

  const handleDelete = async () => {
    setDeleteOpen(false)
    onClose()
    await deleteEvent.mutateAsync(event.id)
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={event.title}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              {(can('edit_events') || isCreator) && (
                <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil size={14} />Rediger
                </Button>
              )}
              {(can('delete_events') || isCreator) && (
                <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={14} />Slet
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {(['attending', 'maybe', 'not_attending'] as const).map((status) => {
                const labels = { attending: '✓ Deltager', maybe: '? Måske', not_attending: '✗ Deltager ikke' }
                return (
                  <button
                    key={status}
                    disabled={isPending}
                    onClick={() => rsvp({ eventId: event.id, rsvp: status })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      myParticipant?.rsvp === status
                        ? 'bg-forest text-ivory border-forest'
                        : 'bg-surface border-border text-muted hover:text-parchment'
                    }`}
                  >
                    {labels[status]}
                  </button>
                )
              })}
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Meta */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <EventStatusBadge status={event.status} />
              {myParticipant && <RSVPBadge rsvp={myParticipant.rsvp} />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="flex items-center gap-2 text-sm text-muted">
                <CalendarDays size={15} className="text-gold/60 flex-shrink-0" />
                <div>
                  <p className="text-parchment/90">{formatDateTime(event.starts_at)}</p>
                  <p className="text-xs">{formatDateTime(event.ends_at)}</p>
                </div>
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <MapPin size={15} className="text-gold/60 flex-shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>

          {event.description && (
            <div>
              <h4 className="text-label-sm text-muted uppercase tracking-wider mb-2">Beskrivelse</h4>
              <p className="text-sm text-parchment/80 leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Participants */}
          <div>
            <h4 className="text-label-sm text-muted uppercase tracking-wider mb-3">Deltagere</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface rounded-lg p-3">
                <p className="text-xs text-muted mb-2">Deltager ({attending.length})</p>
                {attending.length > 0
                  ? <AvatarGroup members={attending.map((p) => p.profile!).filter(Boolean)} max={8} size="sm" />
                  : <p className="text-xs text-muted/60">Ingen endnu</p>
                }
              </div>
              <div className="bg-surface rounded-lg p-3">
                <p className="text-xs text-muted mb-2">Måske ({maybe.length})</p>
                {maybe.length > 0
                  ? <AvatarGroup members={maybe.map((p) => p.profile!).filter(Boolean)} max={8} size="sm" />
                  : <p className="text-xs text-muted/60">Ingen endnu</p>
                }
              </div>
            </div>
          </div>

          {/* Budget */}
          {(event.budget_dkk || event.expenses?.length) ? (
            <div>
              <h4 className="text-label-sm text-muted uppercase tracking-wider mb-3">Økonomi</h4>
              <div className="bg-surface rounded-lg p-4 space-y-2">
                {event.budget_dkk && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Planlagt budget</span>
                    <span className="text-parchment font-medium">{formatDKK(event.budget_dkk)}</span>
                  </div>
                )}
                {event.expenses?.map((exp) => (
                  <div key={exp.id} className="flex justify-between text-sm">
                    <span className="text-muted">{exp.description}</span>
                    <span className="text-red-400">- {formatDKK(exp.amount_dkk)}</span>
                  </div>
                ))}
                {totalExpenses > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted font-medium">Total udgifter</span>
                    <span className="text-parchment font-medium">{formatDKK(totalExpenses)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

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
