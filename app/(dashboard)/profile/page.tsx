import type { Metadata } from 'next'
import { ProfileContent } from '@/components/profile/profile-content'

export const metadata: Metadata = { title: 'Min Profil' }

export default function ProfilePage() {
  return <ProfileContent />
}
