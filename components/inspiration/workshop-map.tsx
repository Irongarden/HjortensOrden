'use client'

import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { MemberMap } from '@/components/members/member-map'
import type { ExtraMarker } from '@/components/members/member-map'
import { useMembers } from '@/lib/hooks/use-members'
import { useEvents } from '@/lib/hooks/use-events'
import type { Database } from '@/lib/types/supabase'

function supa() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export function WorkshopMap() {
  const { data: members = [] } = useMembers()
  const { data: events = [] } = useEvents()
  const withLocations = members.filter((m) => m.lat != null && m.lng != null)
  const [extraMarkers, setExtraMarkers] = useState<ExtraMarker[]>([])

  useEffect(() => {
    let cancelled = false

    async function buildMarkers() {
      const markers: ExtraMarker[] = []

      // 1 — Published proposals with stored coordinates (no geocoding needed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: proposals } = await (supa() as any)
        .from('arrangement_proposals')
        .select('title, location, lat, lng')
        .in('publish_status', ['soft', 'full'])
        .not('lat', 'is', null)
      if (proposals) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const p of proposals as any[]) {
          markers.push({
            lat: p.lat as number,
            lng: p.lng as number,
            title: p.title as string,
            subtitle: (p.location as string | null) ?? undefined,
          })
        }
      }

      // 2 — Completed events: geocode via Nominatim (rate-limited to 1 req/s)
      const completed = events.filter((e) => e.status === 'completed' && e.location)
      for (const event of completed) {
        if (cancelled) return
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(event.location!)}&format=json&limit=1&countrycodes=dk,se,no,de,gb`,
            { headers: { 'Accept-Language': 'da', 'User-Agent': 'HjortensOrden/1.0' } },
          )
          const results = await res.json()
          if (results.length > 0) {
            markers.push({
              lat:      parseFloat(results[0].lat),
              lng:      parseFloat(results[0].lon),
              title:    event.title,
              subtitle: event.location ?? undefined,
              color:    '#4ade80',
              icon:     '🦌',
            })
          }
          await new Promise((r) => setTimeout(r, 350))
        } catch { /* ignore individual failures */ }
      }

      if (!cancelled) setExtraMarkers(markers)
    }

    buildMarkers()
    return () => { cancelled = true }
  // Re-run when events or proposals change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.filter((e) => e.status === 'completed').map((e) => e.id).join(',')])

  const proposalCount = extraMarkers.filter((m) => !m.color).length
  const eventCount    = extraMarkers.filter((m) =>  m.color).length
  const extraLegend   = eventCount > 0 ? [{ color: '#4ade80', label: `Afholdt (${eventCount})` }] : []

  return (
    <>
      <MemberMap
        height={260}
        showHeader={false}
        showMemberList={false}
        extraMarkers={extraMarkers}
        extraLegend={extraLegend}
      />
      <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1.5">
        <MapPin size={10} className="text-gold/50" />
        {withLocations.length > 0
          ? `${withLocations.length} ${withLocations.length === 1 ? 'members lokation' : 'members lokationer'}`
          : 'Ingen medlemmer har sat en lokation endnu'}
        {proposalCount > 0 && ` · ${proposalCount} ${proposalCount === 1 ? 'forslag' : 'forslag'}`}
        {eventCount    > 0 && ` · ${eventCount} ${eventCount === 1 ? 'afholdt arrangement' : 'afholdte arrangementer'}`}
      </p>
    </>
  )
}