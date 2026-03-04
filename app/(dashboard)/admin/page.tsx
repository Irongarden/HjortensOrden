import type { Metadata } from 'next'
import { AdminContent } from '@/components/admin/admin-content'

export const metadata: Metadata = { title: 'Administration' }

// Middleware handles authentication. Role check is done client-side in AdminContent.
export default function AdminPage() {
  return <AdminContent />
}
