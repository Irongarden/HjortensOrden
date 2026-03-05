import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const VedtaegterContent = dynamic(
  () => import('@/components/vedtaegter/vedtaegter-content').then((m) => m.VedtaegterContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Vedtægter — Hjortens Orden' }

export default function VedtaegterPage() {
  return <VedtaegterContent />
}
