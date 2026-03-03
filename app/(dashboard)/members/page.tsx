import type { Metadata } from 'next'
import { MembersContent } from '@/components/members/members-content'

export const metadata: Metadata = { title: 'Medlemmer' }

export default function MembersPage() {
  return <MembersContent />
}
