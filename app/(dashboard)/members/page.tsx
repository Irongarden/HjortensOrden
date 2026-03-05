import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const MembersContent = dynamic(
  () => import('@/components/members/members-content').then((m) => m.MembersContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Medlemmer' }

export default function MembersPage() {
  return <MembersContent />
}
