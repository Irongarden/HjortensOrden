import type { Metadata } from 'next'
import { EventsContent } from '@/components/events/events-content'

export const metadata: Metadata = { title: 'Kalender & Begivenheder' }

export default function EventsPage() {
  return <EventsContent />
}
