import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const AdminContent = dynamic(
  () => import('@/components/admin/admin-content').then((m) => m.AdminContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Administration' }

// Middleware handles authentication. Role check is done client-side in AdminContent.
export default function AdminPage() {
  return <AdminContent />
}
