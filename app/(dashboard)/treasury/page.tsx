import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'

const TreasuryContent = dynamic(
  () => import('@/components/treasury/treasury-content').then((m) => m.TreasuryContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Kasserer' }

const TREASURY_ROLES = ['admin', 'chairman', 'vice_chairman', 'treasurer']

export default async function TreasuryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !TREASURY_ROLES.includes(profile.role)) redirect('/dashboard')

  return <TreasuryContent />
}
