'use client'

import { useEffect, useRef } from 'react'
import { useMembers } from '@/lib/hooks/use-members'
import { Avatar } from '@/components/ui/avatar'
import type { Profile } from '@/lib/types'

interface MemberMapProps {
  className?: string
  /** Height of the map tile area (default 320px) */
  height?: number | string
  /** Show the "Medlemmernes bopæl" header (default true) */
  showHeader?: boolean
  /** Show the member list below the map (default true) */
  showMemberList?: boolean
  /** Extra pins to display (e.g. event/proposal locations) */
  extraMarkers?: ExtraMarker[]
}

export interface ExtraMarker {
  lat: number
  lng: number
  title: string
  subtitle?: string
}

export function MemberMap({
  className = '',
  height = 320,
  showHeader = true,
  showMemberList = true,
  extraMarkers = [],
}: MemberMapProps) {
  const { data: members = [] } = useMembers()

  const mapRef      = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef  = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef  = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extraMarkersRef = useRef<any[]>([])
  const membersRef  = useRef<Profile[]>(members)
  const extraMarkersDataRef = useRef<ExtraMarker[]>(extraMarkers)

  const withLocation = members.filter(
    (m): m is Profile & { lat: number; lng: number } => m.lat != null && m.lng != null,
  )

  // ── Shared marker helper ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addMarkers = (L: any, map: any, list: Profile[]) => {
    markersRef.current.forEach((mk) => mk.remove())
    markersRef.current = []

    list
      .filter((m): m is Profile & { lat: number; lng: number } => m.lat != null && m.lng != null)
      .forEach((m) => {
        const avatarHtml = m.avatar_url
          ? `<img src="${m.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#cfa84a;font-family:Georgia,serif">${(m.full_name || '?')[0].toUpperCase()}</div>`

        const icon = L.divIcon({
          className: '',
          html: `<div style="width:38px;height:38px;border-radius:50%;border:2.5px solid #cfa84a;overflow:hidden;background:#f5f0e8;box-shadow:0 2px 10px rgba(0,0,0,.35);cursor:pointer">${avatarHtml}</div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          popupAnchor: [0, -22],
        })

        const popup = `
          <div style="font-family:Georgia,serif;min-width:130px;text-align:center;padding:4px 2px">
            ${m.avatar_url ? `<img src="${m.avatar_url}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #cfa84a;margin:0 auto 6px;display:block" />` : ''}
            <strong style="font-size:13px;color:#2a1f0e">${m.full_name}</strong>
            ${m.city ? `<br/><span style="font-size:11px;color:#666">${m.city}</span>` : ''}
          </div>`

        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(popup)
        markersRef.current.push(marker)
      })
  }

  // ── Extra markers (event / proposal locations) ─────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addExtraMarkers = (L: any, map: any, extras: ExtraMarker[]) => {
    extraMarkersRef.current.forEach((mk) => mk.remove())
    extraMarkersRef.current = []

    extras.forEach((em) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:34px;height:34px;border-radius:6px;border:2px solid #cfa84a;background:#1a1209;box-shadow:0 2px 8px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:17px">🏰</div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #cfa84a;margin-top:-1px"></div>
        </div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -44],
      })
      const popup = `
        <div style="font-family:Georgia,serif;min-width:150px;padding:4px 2px">
          <strong style="font-size:13px;color:#2a1f0e">🏰 ${em.title}</strong>
          ${em.subtitle ? `<br/><span style="font-size:11px;color:#666">${em.subtitle}</span>` : ''}
        </div>`
      const marker = L.marker([em.lat, em.lng], { icon }).addTo(map).bindPopup(popup)
      extraMarkersRef.current.push(marker)
    })
  }

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || typeof window === 'undefined') return

    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstance.current) return
      leafletRef.current = L

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center: [56.0, 10.5],
        zoom: 7,
        zoomControl: true,
        attributionControl: true,
      })

      // Light tile layer — CartoDB Voyager (clean, detailed, light)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      mapInstance.current = map

      // If member data already arrived before Leaflet loaded — add markers now
      addMarkers(L, map, membersRef.current)
      addExtraMarkers(L, map, extraMarkersDataRef.current)
    })

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
      leafletRef.current  = null
      markersRef.current  = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Refresh markers when member data changes ───────────────────────────────
  useEffect(() => {
    membersRef.current = members
    if (mapInstance.current && leafletRef.current) {
      addMarkers(leafletRef.current, mapInstance.current, members)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members])

  // ── Refresh extra markers when proposal data changes ───────────────────────
  useEffect(() => {
    extraMarkersDataRef.current = extraMarkers
    if (mapInstance.current && leafletRef.current) {
      addExtraMarkers(leafletRef.current, mapInstance.current, extraMarkers)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraMarkers])

  return (
    <div className={`border border-border rounded-xl overflow-hidden isolate ${className}`}>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Optional header */}
      {showHeader && (
        <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-charcoal">
          <div>
            <h3 className="font-serif text-heading-sm text-parchment">Medlemmernes bopæl</h3>
            <p className="text-xs text-muted mt-0.5">
              {withLocation.length} af {members.filter((m) => m.status === 'active').length} aktive medlemmer har angivet lokation
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-gold inline-block" /> Bopæl
            </span>
          </div>
        </div>
      )}

      {/* Map */}
      <div ref={mapRef} style={{ height: typeof height === 'number' ? `${height}px` : height }} className="w-full" />

      {/* Optional member list below map */}
      {showMemberList && withLocation.length > 0 && (
        <div className="px-5 py-4 border-t border-border/50 bg-charcoal">
          <div className="flex flex-wrap gap-3">
            {withLocation.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar src={m.avatar_url} name={m.full_name} size="xs" />
                <div className="text-xs">
                  <p className="text-parchment/80 font-medium">{m.full_name}</p>
                  <p className="text-muted">{m.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showMemberList && withLocation.length === 0 && (
        <p className="px-5 py-4 text-xs text-muted italic bg-charcoal">
          Ingen medlemmer har sat en by på deres profil endnu.
        </p>
      )}
    </div>
  )
}