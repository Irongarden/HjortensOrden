import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const EventsContent = dynamic(
  () => import('@/components/events/events-content').then((m) => m.EventsContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Kalender & Begivenheder' }

export default function EventsPage() {
  return <EventsContent />
}
