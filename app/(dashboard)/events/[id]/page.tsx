import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const EventDetailPage = dynamic(
  () => import('@/components/events/event-detail-page').then((m) => m.EventDetailPage),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Begivenhed' }

export default function EventPage({ params }: { params: { id: string } }) {
  return <EventDetailPage id={params.id} />
}
