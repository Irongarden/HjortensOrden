import type { Metadata } from 'next'
import { VedtaegterContent } from '@/components/vedtaegter/vedtaegter-content'

export const metadata: Metadata = { title: 'Vedtægter — Hjortens Orden' }

export default function VedtaegterPage() {
  return <VedtaegterContent />
}
