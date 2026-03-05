import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const ProfileContent = dynamic(
  () => import('@/components/profile/profile-content').then((m) => m.ProfileContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Min Profil' }

export default function ProfilePage() {
  return <ProfileContent />
}
