import type { Metadata } from 'next'
import { EventDetailPage } from '@/components/events/event-detail-page'

export const metadata: Metadata = { title: 'Begivenhed' }

export default function EventPage({ params }: { params: { id: string } }) {
  return <EventDetailPage id={params.id} />
}
