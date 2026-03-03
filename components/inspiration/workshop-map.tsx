'use client'

import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { MemberMap } from '@/components/members/member-map'
import type { ExtraMarker } from '@/components/members/member-map'
import { useMembers } from '@/lib/hooks/use-members'
import type { Database } from '@/lib/types/supabase'

function supa() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export function WorkshopMap() {
  const { data: members = [] } = useMembers()
  const withLocations = members.filter((m) => m.lat != null && m.lng != null)
  const [proposalMarkers, setProposalMarkers] = useState<ExtraMarker[]>([])

  useEffect(() => {
    async function fetchPublishedProposals() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supa() as any)
        .from('arrangement_proposals')
        .select('title, location, lat, lng')
        .in('publish_status', ['soft', 'full'])
        .not('lat', 'is', null)
      if (data) {
        setProposalMarkers(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data as any[]).map((p) => ({
            lat: p.lat as number,
            lng: p.lng as number,
            title: p.title as string,
            subtitle: (p.location as string | null) ?? undefined,
          })),
        )
      }
    }
    fetchPublishedProposals()
  }, [])

  return (
    <>
      <MemberMap height={260} showHeader={false} showMemberList={false} extraMarkers={proposalMarkers} />
      <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1.5">
        <MapPin size={10} className="text-gold/50" />
        {withLocations.length > 0
          ? `Viser ${withLocations.length} ${withLocations.length === 1 ? 'members lokation' : 'members lokationer'}`
          : 'Ingen medlemmer har sat en lokation endnu — gå til Profil for at tilføje din by.'}
        {proposalMarkers.length > 0 && ` · ${proposalMarkers.length} ${proposalMarkers.length === 1 ? 'arrangementlokation' : 'arrangementlokationer'}`}
      </p>
    </>
  )
}