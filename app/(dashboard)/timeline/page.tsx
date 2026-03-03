import type { Metadata } from 'next'
import { TimelineContent } from '@/components/timeline/timeline-content'

export const metadata: Metadata = { title: 'Tidslinje' }

export default function TimelinePage() {
  return <TimelineContent />
}
