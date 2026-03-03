import type { Metadata } from 'next'
import { PollsContent } from '@/components/polls/polls-content'

export const metadata: Metadata = { title: 'Afstemninger' }

export default function PollsPage() {
  return <PollsContent />
}
