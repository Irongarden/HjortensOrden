import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const TimelineContent = dynamic(
  () => import('@/components/timeline/timeline-content').then((m) => m.TimelineContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Tidslinje' }

export default function TimelinePage() {
  return <TimelineContent />
}
