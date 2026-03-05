import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/ui/skeleton'

const DashboardContent = dynamic(
  () => import('@/components/dashboard/dashboard-content').then((m) => m.DashboardContent),
  { ssr: false, loading: () => <PageLoader /> },
)

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return <DashboardContent />
}
