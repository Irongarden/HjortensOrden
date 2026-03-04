'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, Event as RBCEvent, Views, SlotInfo } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { da } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { motion } from 'framer-motion'
import { Plus, List, CalendarDays } from 'lucide-react'
import { useEvents } from '@/lib/hooks/use-events'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EventModal } from './event-modal'
import { EventDetailModal } from './event-detail-modal'
import { EventListView } from './event-list-view'
import { Event, EventStatus } from '@/lib/types'
import { getMonthKey } from '@/lib/utils'
import Link from 'next/link'

const locales = { 'da': da }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

type ViewMode = 'calendar' | 'list'

const STATUS_STYLES: Record<EventStatus, React.CSSProperties> = {
  draft:     { backgroundColor: 'rgba(138,144,153,0.15)', borderLeft: '3px solid #8a9099', color: '#8a9099' },
  published: { backgroundColor: 'rgba(207,168,74,0.15)',  borderLeft: '3px solid #cfa84a', color: '#e8e0d0' },
  cancelled: { backgroundColor: 'rgba(220,38,38,0.12)',   borderLeft: '3px solid #f87171', color: '#f87171' },
  completed: { backgroundColor: 'rgba(26,122,73,0.15)',   borderLeft: '3px solid #4ade80', color: '#86efac' },
}

export function EventsContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [createOpen, setCreateOpen] = useState(false)
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const { can } = useAuthStore()

  const monthKey = getMonthKey(currentDate)
  const { data: events = [], isLoading } = useEvents()

  const calendarEvents: RBCEvent[] = events.map((e) => ({
    title: e.title,
    start: new Date(e.starts_at),
    end: new Date(e.ends_at),
    resource: e,
  }))

  const handleSelectEvent = useCallback((event: RBCEvent) => {
    setSelectedEvent(event.resource as Event)
  }, [])

  const handleSelectSlot = useCallback((slot: SlotInfo) => {
    if (!can('create_events')) return
    const iso = (slot.start as Date).toISOString().slice(0, 16)
    setCreateDefaultDate(iso)
    setCreateOpen(true)
  }, [can])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between page-header-row">
        <div>
          <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Ordenens</p>
          <h1 className="font-serif text-display-sm text-parchment">Kalender</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-charcoal text-parchment' : 'text-muted hover:text-parchment'}`}
              title="Kalendervisning"
            >
              <CalendarDays size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-charcoal text-parchment' : 'text-muted hover:text-parchment'}`}
              title="Listevisning"
            >
              <List size={16} />
            </button>
          </div>

          {can('create_events') && (
            <Button variant="gold" size="sm" onClick={() => { setCreateDefaultDate(undefined); setCreateOpen(true) }}>
              <Plus size={16} />
              Ny begivenhed
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      {viewMode === 'calendar' && (
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { status: 'draft',     label: 'Kladde',     color: '#8a9099', bg: 'rgba(138,144,153,0.15)' },
            { status: 'published', label: 'Publiceret', color: '#cfa84a', bg: 'rgba(207,168,74,0.15)'  },
            { status: 'cancelled', label: 'Aflyst',     color: '#f87171', bg: 'rgba(220,38,38,0.12)'   },
            { status: 'completed', label: 'Afholdt',    color: '#4ade80', bg: 'rgba(26,122,73,0.15)'   },
          ] as const).map(({ status, label, color, bg }) => (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium"
              style={{ color, backgroundColor: bg, borderColor: color + '50' }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
          {can('create_events') && (
            <span className="text-xs text-muted/60 italic ml-1">· Klik på en tom dag for at oprette</span>
          )}
        </div>
      )}

      {/* Calendar / List */}
      {isLoading ? (
        <div className="bg-charcoal border border-border rounded-xl p-4 space-y-3" style={{ minHeight: 680 }}>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="bg-charcoal border border-border rounded-xl p-4 shadow-card" style={{ minHeight: 680 }}>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 640 }}
            defaultView={Views.MONTH}
            views={[Views.MONTH]}
            toolbar
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable={can('create_events')}
            onNavigate={setCurrentDate}
            date={currentDate}
            culture="da"
            eventPropGetter={(event) => ({
              style: STATUS_STYLES[(event.resource as Event).status] ?? STATUS_STYLES.published,
            })}
            messages={{
              next: 'Næste',
              previous: 'Forrige',
              today: 'I dag',
              month: 'Måned',
              noEventsInRange: 'Ingen begivenheder i denne periode',
              showMore: (total) => `+ ${total} flere`,
            }}
          />
        </div>
      ) : (
        <EventListView events={events} onSelect={setSelectedEvent} />
      )}

      {/* Create Modal */}
      <EventModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateDefaultDate(undefined) }}
        defaultStartDate={createDefaultDate}
      />

      {/* Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </motion.div>
  )
}
