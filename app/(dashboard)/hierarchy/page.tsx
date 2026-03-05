import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const HierarchyContent = dynamic(
  () => import('@/components/hierarchy/hierarchy-content').then((m) => m.HierarchyContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Hierarki' }

export default function HierarchyPage() {
  return <HierarchyContent />
}
