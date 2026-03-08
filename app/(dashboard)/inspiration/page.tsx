import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const InspirationContent = dynamic(
  () => import('@/components/inspiration/inspiration-content').then((m) => m.InspirationContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Inspiration' }

export default function InspirationPage() {
  return <InspirationContent />
}
