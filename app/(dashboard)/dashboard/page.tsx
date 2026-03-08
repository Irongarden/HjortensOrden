import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const DashboardContent = dynamic(
  () => import('@/components/dashboard/dashboard-content').then((m) => m.DashboardContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return <DashboardContent />
}
