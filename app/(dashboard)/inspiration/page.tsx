import { Suspense } from 'react'
import type { Metadata } from 'next'
import { InspirationContent } from '@/components/inspiration/inspiration-content'
import { PageLoader } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Inspiration' }

export default function InspirationPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <InspirationContent />
    </Suspense>
  )
}
