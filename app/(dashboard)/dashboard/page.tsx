import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { PageLoader } from '@/components/ui/skeleton'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <Suspense fallback={<PageLoader />}>
      <DashboardContent />
    </Suspense>
  )
}
