import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const PollsContent = dynamic(
  () => import('@/components/polls/polls-content').then((m) => m.PollsContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Afstemninger' }

export default function PollsPage() {
  return <PollsContent />
}
