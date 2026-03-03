import type { Metadata } from 'next'
import { HierarchyContent } from '@/components/hierarchy/hierarchy-content'

export const metadata: Metadata = { title: 'Hierarki' }

export default function HierarchyPage() {
  return <HierarchyContent />
}
